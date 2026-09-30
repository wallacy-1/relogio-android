package expo.modules.clocknative

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.database.Cursor
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import org.json.JSONObject

data class RingInfo(
  val kind: String,
  val id: String,
  val label: String,
  val time: String,
  val sound: String,
  val vibrate: Boolean,
  val gradual: Boolean,
  val snoozeMin: Int,
  val startedAt: Long = System.currentTimeMillis(),
) {
  fun toMap(): Map<String, Any> = mapOf(
    "kind" to kind, "id" to id, "label" to label, "time" to time,
    "sound" to sound, "snoozeMin" to snoozeMin,
  )

  fun toJson(): String = JSONObject(toMap())
    .put("vibrate", vibrate).put("gradual", gradual).put("startedAt", startedAt)
    .toString()

  companion object {
    fun fromJson(o: JSONObject) = RingInfo(
      kind = o.optString("kind", Scheduler.KIND_ALARM),
      id = o.optString("id"),
      label = o.optString("label"),
      time = o.optString("time"),
      sound = o.optString("sound", "Manhã"),
      vibrate = o.optBoolean("vibrate", true),
      gradual = o.optBoolean("gradual", false),
      snoozeMin = o.optInt("snoozeMin", 10),
      startedAt = o.optLong("startedAt", 0),
    )
  }
}

/**
 * Toca o alarme/timer em primeiro plano: som em loop no canal de alarme,
 * vibração e notificação de tela cheia que acende a tela sobre o bloqueio.
 * Roda no processo ":ring", então continua tocando mesmo se o app (JS) cair.
 */
class RingService : Service() {
  companion object {
    const val CHANNEL_RING = "ringing"
    private const val NOTIF_ID = 4201
    private const val ACTION_START = "start"
    const val ACTION_STOP = "stop"
    const val ACTION_SNOOZE = "snooze"
    const val ACTION_ADD_MINUTE = "add_minute"
    private const val AUTO_SILENCE_MS = 10 * 60_000L
    private const val RAMP_MS = 30_000L

    /** Broadcast interno avisando o processo do app que um toque começou/parou. */
    const val ACTION_RING_CHANGED = "expo.modules.clocknative.RING_CHANGED"

    /** Toque atual lido de qualquer processo; descarta registro velho de um processo morto. */
    fun currentRing(ctx: Context): RingInfo? =
      Store.ringing(ctx)?.takeIf { System.currentTimeMillis() - it.startedAt < AUTO_SILENCE_MS + 60_000 }

    fun startIntent(ctx: Context, info: RingInfo) = Intent(ctx, RingService::class.java).apply {
      action = ACTION_START
      putExtra("kind", info.kind); putExtra("id", info.id); putExtra("label", info.label)
      putExtra("time", info.time); putExtra("sound", info.sound); putExtra("vibrate", info.vibrate)
      putExtra("gradual", info.gradual); putExtra("snoozeMin", info.snoozeMin)
    }

    fun actionIntent(ctx: Context, action: String) = Intent(ctx, RingService::class.java).setAction(action)

    fun ensureChannel(ctx: Context) {
      val nm = ctx.getSystemService(NotificationManager::class.java)
      if (nm.getNotificationChannel(CHANNEL_RING) != null) return
      val ch = NotificationChannel(CHANNEL_RING, "Alarmes e timers tocando", NotificationManager.IMPORTANCE_HIGH).apply {
        description = "Tela cheia quando um alarme ou timer toca"
        setSound(null, null) // o som sai do MediaPlayer, com volume gradual
        enableVibration(false)
        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        setBypassDnd(true)
      }
      nm.createNotificationChannel(ch)
    }

    /** Mapeia os nomes do app para toques de alarme do sistema. */
    fun soundUri(ctx: Context, name: String): Uri? {
      if (name == "Silencioso") return null
      val index = listOf("Manhã", "Brisa", "Sino", "Pássaros").indexOf(name).coerceAtLeast(0)
      val fallback = RingtoneManager.getActualDefaultRingtoneUri(ctx, RingtoneManager.TYPE_ALARM)
        ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
        ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
      if (index == 0) return fallback
      return try {
        val rm = RingtoneManager(ctx).apply { setType(RingtoneManager.TYPE_ALARM) }
        val c: Cursor = rm.cursor
        if (c.count > index) rm.getRingtoneUri(index) else fallback
      } catch (_: Exception) {
        fallback
      }
    }
  }

  private var current: RingInfo? = null
  private var player: MediaPlayer? = null
  private var vibrator: Vibrator? = null
  private var wakeLock: PowerManager.WakeLock? = null
  private val handler = Handler(Looper.getMainLooper())

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_START -> start(
        RingInfo(
          kind = intent.getStringExtra("kind") ?: Scheduler.KIND_ALARM,
          id = intent.getStringExtra("id") ?: "",
          label = intent.getStringExtra("label") ?: "",
          time = intent.getStringExtra("time") ?: "",
          sound = intent.getStringExtra("sound") ?: "Manhã",
          vibrate = intent.getBooleanExtra("vibrate", true),
          gradual = intent.getBooleanExtra("gradual", false),
          snoozeMin = intent.getIntExtra("snoozeMin", 10),
        ),
      )
      ACTION_SNOOZE -> {
        current?.let { if (it.kind == Scheduler.KIND_ALARM) Scheduler.scheduleSnooze(this, it.id, it.snoozeMin) }
        finish()
      }
      ACTION_ADD_MINUTE -> {
        current?.let {
          if (it.kind == Scheduler.KIND_TIMER) {
            val endAt = System.currentTimeMillis() + 60_000
            Scheduler.scheduleTimer(this, TimerEntry(it.id, endAt, it.label))
            // troca a notificação "estourada" do timer; o app reajusta a lista ao voltar
            Ongoing.showTimer(this, it.id, it.label, endAt, 60_000, 60_000, false)
          }
        }
        finish()
      }
      ACTION_STOP -> finish()
      else -> if (current == null) finish()
    }
    return START_NOT_STICKY
  }

  private fun start(info: RingInfo) {
    if (current != null) releaseMedia()
    current = info
    ensureChannel(this)

    val notif = buildNotification(info)
    ServiceCompat.startForeground(
      this, NOTIF_ID, notif,
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK else 0,
    )

    val pm = getSystemService(PowerManager::class.java)
    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "relogio:ring").apply { acquire(AUTO_SILENCE_MS + 5_000) }

    playSound(info)
    if (info.vibrate) vibrate()
    handler.postDelayed({ finish() }, AUTO_SILENCE_MS)

    Store.setRinging(this, info)
    notifyApp("onRingStart", info)
  }

  private fun buildNotification(info: RingInfo): Notification {
    val fullScreen = Scheduler.launchPending(this, "ringing", 7)
    fun svc(action: String, code: Int) = PendingIntent.getService(
      this, code, actionIntent(this, action),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val isAlarm = info.kind == Scheduler.KIND_ALARM
    val title = if (isAlarm) "${info.time} · ${info.label}" else "Tempo esgotado"
    val text = if (isAlarm) "Alarme tocando" else info.label
    return NotificationCompat.Builder(this, CHANNEL_RING)
      .setSmallIcon(R.drawable.ic_stat_clock)
      .setColor(0xFFC67139.toInt())
      .setContentTitle(title)
      .setContentText(text)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setAutoCancel(false)
      .setContentIntent(fullScreen)
      .setFullScreenIntent(fullScreen, true)
      .apply {
        if (isAlarm) {
          addAction(0, "Soneca", svc(ACTION_SNOOZE, 11))
          addAction(0, "Parar", svc(ACTION_STOP, 12))
        } else {
          addAction(0, "Parar", svc(ACTION_STOP, 12))
          addAction(0, "+1 min", svc(ACTION_ADD_MINUTE, 13))
        }
      }
      .build()
  }

  private fun playSound(info: RingInfo) {
    val uri = soundUri(this, info.sound) ?: return
    try {
      val mp = MediaPlayer().apply {
        setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build(),
        )
        setDataSource(this@RingService, uri)
        isLooping = true
        prepare()
      }
      player = mp
      if (info.gradual) {
        val start = System.currentTimeMillis()
        mp.setVolume(0.05f, 0.05f)
        val ramp = object : Runnable {
          override fun run() {
            val p = player ?: return
            val f = ((System.currentTimeMillis() - start).toFloat() / RAMP_MS).coerceIn(0.05f, 1f)
            p.setVolume(f, f)
            if (f < 1f) handler.postDelayed(this, 500)
          }
        }
        handler.post(ramp)
      }
      mp.start()
    } catch (_: Exception) {
      // sem som disponível: ainda notifica e vibra
    }
  }

  private fun vibrate() {
    val v = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      getSystemService(VibratorManager::class.java).defaultVibrator
    } else {
      @Suppress("DEPRECATION")
      getSystemService(Vibrator::class.java)
    }
    vibrator = v
    val attrs = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build()
    @Suppress("DEPRECATION")
    v.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 600, 400, 600, 1200), 0), attrs)
  }

  private fun releaseMedia() {
    handler.removeCallbacksAndMessages(null)
    player?.run { try { stop() } catch (_: Exception) {}; release() }
    player = null
    vibrator?.cancel()
    vibrator = null
    wakeLock?.let { if (it.isHeld) it.release() }
    wakeLock = null
  }

  private fun finish() {
    releaseMedia()
    // sem toque neste processo, pode haver um registro velho (ex.: processo morto): a tela do app sai mesmo assim
    val info = current ?: Store.ringing(this)
    current = null
    ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
    stopSelf()
    Store.setRinging(this, null)
    Widgets.updateAll(this)
    if (info != null) notifyApp("onRingStop", info)
  }

  private fun notifyApp(event: String, info: RingInfo) {
    sendBroadcast(
      Intent(ACTION_RING_CHANGED).setPackage(packageName)
        .putExtra("event", event).putExtra("info", info.toJson()),
    )
  }

  override fun onDestroy() {
    releaseMedia()
    current = null
    super.onDestroy()
  }
}
