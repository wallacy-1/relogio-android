package expo.modules.clocknative

import android.Manifest
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.IntentFilter
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import org.json.JSONObject

class ClockNativeModule : Module() {
  private var ringReceiver: BroadcastReceiver? = null

  private val ctx: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("ClockNative")

    Events("onRingStart", "onRingStop")

    OnCreate {
      val receiver = object : BroadcastReceiver() {
        override fun onReceive(c: Context, intent: Intent) {
          val event = intent.getStringExtra("event") ?: return
          val info = RingInfo.fromJson(JSONObject(intent.getStringExtra("info") ?: return))
          sendEvent(event, info.toMap())
        }
      }
      ContextCompat.registerReceiver(ctx, receiver, IntentFilter(RingService.ACTION_RING_CHANGED), ContextCompat.RECEIVER_NOT_EXPORTED)
      ringReceiver = receiver
      RingService.ensureChannel(ctx)
      publishShortcuts(ctx)
    }

    OnDestroy {
      ringReceiver?.let { r -> appContext.reactContext?.let { runCatching { it.unregisterReceiver(r) } } }
      ringReceiver = null
    }

    Function("setAlarms") { json: String ->
      val incoming = JSONArray(json).let { arr -> (0 until arr.length()).map { Alarm.fromJson(arr.getJSONObject(it)) } }
      val ids = incoming.map { it.id }.toSet()
      // cancela os agendamentos de alarmes que foram excluídos
      Store.alarms(ctx).filter { it.id !in ids }.forEach { Scheduler.scheduleAlarm(ctx, it.copy(on = false)) }
      Store.saveAlarms(ctx, incoming)
      incoming.forEach { Scheduler.scheduleAlarm(ctx, it) }
      Widgets.updateAll(ctx)
    }

    Function("getAlarms") { Store.alarmsJson(ctx) }

    Function("setSettings") { json: String -> Store.saveSettingsJson(ctx, json) }

    Function("scheduleTimer") { id: String, endAt: Double, label: String ->
      Scheduler.scheduleTimer(ctx, TimerEntry(id, endAt.toLong(), label))
    }

    Function("cancelTimer") { id: String -> Scheduler.cancelTimer(ctx, id) }

    Function("getTimers") { Store.timersJson(ctx) }

    Function("showTimerNotification") { id: String, label: String, endAt: Double, totalMs: Double, remainingMs: Double, paused: Boolean ->
      Ongoing.showTimer(ctx, id, label, endAt.toLong(), totalMs.toLong(), remainingMs.toLong(), paused)
    }

    Function("cancelTimerNotification") { id: String -> Ongoing.cancelTimer(ctx, id) }

    Function("showStopwatchNotification") { elapsedMs: Double, running: Boolean, laps: Int ->
      Ongoing.showStopwatch(ctx, elapsedMs.toLong(), running, laps)
    }

    Function("cancelStopwatchNotification") { Ongoing.cancelStopwatch(ctx) }

    Function("getRinging") { RingService.currentRing(ctx)?.toMap() }

    Function("stopRinging") { sendRingAction(RingService.ACTION_STOP) }
    Function("snoozeRinging") { sendRingAction(RingService.ACTION_SNOOZE) }
    Function("addMinuteRinging") { sendRingAction(RingService.ACTION_ADD_MINUTE) }

    /** Tela de alarme tocando aparece sobre o bloqueio e acende a tela. */
    Function("setShowWhenLocked") { enabled: Boolean ->
      val activity = appContext.currentActivity ?: return@Function null
      activity.runOnUiThread {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
          activity.setShowWhenLocked(enabled)
          activity.setTurnScreenOn(enabled)
        }
      }
    }

    Function("getPermissions") {
      val nm = ctx.getSystemService(NotificationManager::class.java)
      mapOf(
        "notifications" to NotificationManagerCompat.from(ctx).areNotificationsEnabled(),
        "exactAlarms" to Scheduler.canScheduleExact(ctx),
        "fullScreen" to (Build.VERSION.SDK_INT < 34 || nm.canUseFullScreenIntent()),
      )
    }

    Function("requestNotifications") {
      val activity = appContext.currentActivity ?: return@Function null
      if (Build.VERSION.SDK_INT >= 33) {
        ActivityCompat.requestPermissions(activity, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 4242)
      }
    }

    Function("openNotificationSettings") {
      openSettings(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, ctx.packageName))
    }

    Function("openExactAlarmSettings") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        openSettings(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${ctx.packageName}")))
      }
    }

    Function("openFullScreenSettings") {
      if (Build.VERSION.SDK_INT >= 34) {
        openSettings(Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:${ctx.packageName}")))
      }
    }

    Function("updateWidgets") { Widgets.updateAll(ctx) }
  }

  private fun sendRingAction(action: String) {
    // mesmo sem toque registrado, o serviço limpa qualquer estado velho
    ctx.startService(RingService.actionIntent(ctx, action))
  }

  private fun openSettings(intent: Intent) {
    val activity = appContext.currentActivity
    if (activity != null) activity.startActivity(intent)
    else ctx.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
  }

  private fun publishShortcuts(ctx: Context) {
    fun sc(id: String, label: String, icon: Int, path: String) =
      ShortcutInfoCompat.Builder(ctx, id)
        .setShortLabel(label)
        .setIcon(IconCompat.createWithResource(ctx, icon))
        .setIntent(Scheduler.launchIntent(ctx, path))
        .build()
    try {
      ShortcutManagerCompat.setDynamicShortcuts(
        ctx,
        listOf(
          sc("new_alarm", "Novo alarme", R.drawable.ic_sc_alarm, "alarm/new"),
          sc("timer_5", "Timer de 5 min", R.drawable.ic_sc_timer, "timer?action=start&sec=300"),
          sc("timer_25", "Timer de 25 min", R.drawable.ic_sc_timer, "timer?action=start&sec=1500"),
          sc("stopwatch", "Iniciar cronômetro", R.drawable.ic_sc_stopwatch, "stopwatch?action=start"),
        ),
      )
    } catch (_: Exception) {
      // launchers sem suporte a atalhos
    }
  }
}
