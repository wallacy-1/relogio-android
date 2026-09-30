package expo.modules.clocknative

import android.content.Context
import java.io.File
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

data class Alarm(
  val id: String,
  val h: Int,
  val m: Int,
  val label: String,
  val days: List<Boolean>, // domingo..sábado
  val on: Boolean,
  val sound: String,
  val vibrate: Boolean,
  val gradual: Boolean,
) {
  val timeText: String get() = "%02d:%02d".format(h, m)
  val repeats: Boolean get() = days.any { it }

  fun toJson(): JSONObject = JSONObject().apply {
    put("id", id); put("h", h); put("m", m); put("label", label)
    put("days", JSONArray(days.map { if (it) 1 else 0 }))
    put("on", on); put("sound", sound); put("vibrate", vibrate); put("gradual", gradual)
  }

  /** Próximo disparo estritamente depois de [from], ou null se não houver. */
  fun nextOccurrence(from: Long = System.currentTimeMillis()): Long? {
    for (i in 0..7) {
      val c = Calendar.getInstance().apply {
        timeInMillis = from
        add(Calendar.DAY_OF_YEAR, i)
        set(Calendar.HOUR_OF_DAY, h); set(Calendar.MINUTE, m)
        set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
      }
      if (c.timeInMillis <= from) continue
      if (!repeats || days[c.get(Calendar.DAY_OF_WEEK) - 1]) return c.timeInMillis
    }
    return null
  }

  companion object {
    fun fromJson(o: JSONObject): Alarm {
      val d = o.optJSONArray("days") ?: JSONArray()
      return Alarm(
        id = o.getString("id"),
        h = o.getInt("h"),
        m = o.getInt("m"),
        label = o.optString("label", ""),
        days = (0 until 7).map { d.optInt(it, 0) != 0 },
        on = o.optBoolean("on", true),
        sound = o.optString("sound", "Manhã"),
        vibrate = o.optBoolean("vibrate", true),
        gradual = o.optBoolean("gradual", false),
      )
    }
  }
}

data class Settings(
  val snoozeMin: Int = 10,
  val timerSound: String = "Sino",
  val timerVibrate: Boolean = false,
) {
  companion object {
    fun fromJson(o: JSONObject) = Settings(
      snoozeMin = o.optInt("snoozeMin", 10),
      timerSound = o.optString("timerSound", "Sino"),
      timerVibrate = o.optBoolean("timerVibrate", false),
    )
  }
}

/** Timer agendado: dispara em [endAt]. Guardado para sobreviver a reinícios. */
data class TimerEntry(val id: String, val endAt: Long, val label: String)

/**
 * Persistência nativa: alarmes e timers precisam existir sem o JS rodando (boot, disparo).
 * Arquivos JSON em vez de SharedPreferences porque o serviço de toque roda em outro
 * processo e SharedPreferences guarda cache por processo.
 */
object Store {
  private val lock = Any()

  private fun file(ctx: Context, name: String): File =
    File(ctx.createDeviceProtectedStorageContext().filesDir, "clock_$name.json")

  private fun read(ctx: Context, name: String, fallback: String): String = synchronized(lock) {
    val f = file(ctx, name)
    if (f.exists()) f.readText() else fallback
  }

  private fun write(ctx: Context, name: String, json: String) = synchronized(lock) {
    val f = file(ctx, name)
    val tmp = File(f.parentFile, f.name + ".tmp")
    tmp.writeText(json)
    tmp.renameTo(f)
  }

  private fun delete(ctx: Context, name: String) = synchronized(lock) { file(ctx, name).delete() }

  fun alarms(ctx: Context): List<Alarm> {
    val arr = JSONArray(alarmsJson(ctx))
    return (0 until arr.length()).map { Alarm.fromJson(arr.getJSONObject(it)) }
  }

  fun alarmsJson(ctx: Context): String = read(ctx, "alarms", "[]")

  fun saveAlarms(ctx: Context, list: List<Alarm>) =
    write(ctx, "alarms", JSONArray(list.map { it.toJson() }).toString())

  fun settings(ctx: Context): Settings = Settings.fromJson(JSONObject(read(ctx, "settings", "{}")))

  fun saveSettingsJson(ctx: Context, json: String) = write(ctx, "settings", json)

  fun timers(ctx: Context): List<TimerEntry> {
    val o = JSONObject(timersJson(ctx))
    return o.keys().asSequence().map {
      val t = o.getJSONObject(it)
      TimerEntry(it, t.getLong("endAt"), t.optString("label", ""))
    }.toList()
  }

  fun putTimer(ctx: Context, t: TimerEntry) = synchronized(lock) {
    val o = JSONObject(timersJson(ctx))
    o.put(t.id, JSONObject().put("endAt", t.endAt).put("label", t.label))
    write(ctx, "timers", o.toString())
  }

  fun removeTimer(ctx: Context, id: String) = synchronized(lock) {
    val o = JSONObject(timersJson(ctx))
    o.remove(id)
    write(ctx, "timers", o.toString())
  }

  fun timersJson(ctx: Context): String = read(ctx, "timers", "{}")

  /** Toque em andamento, visível para o processo do app. */
  fun ringing(ctx: Context): RingInfo? = read(ctx, "ringing", "").takeIf { it.isNotBlank() }?.let {
    RingInfo.fromJson(JSONObject(it))
  }

  fun setRinging(ctx: Context, info: RingInfo?) =
    if (info == null) delete(ctx, "ringing") else write(ctx, "ringing", info.toJson())
}
