package expo.modules.clocknative

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build

object Scheduler {
  const val EXTRA_KIND = "kind"
  const val EXTRA_ID = "id"
  const val KIND_ALARM = "alarm"
  const val KIND_SNOOZE = "snooze"
  const val KIND_TIMER = "timer"

  private fun am(ctx: Context) = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager

  private fun firePending(ctx: Context, kind: String, id: String, flags: Int = 0): PendingIntent? {
    val intent = Intent(ctx, AlarmReceiver::class.java).apply {
      action = "expo.modules.clocknative.FIRE.$kind"
      // data único por alarme para o PendingIntent não colidir entre ids
      data = Uri.parse("clock://$kind/$id")
      putExtra(EXTRA_KIND, kind)
      putExtra(EXTRA_ID, id)
    }
    return PendingIntent.getBroadcast(ctx, 0, intent, flags or PendingIntent.FLAG_IMMUTABLE)
  }

  fun launchPending(ctx: Context, path: String, requestCode: Int = 0): PendingIntent {
    val intent = launchIntent(ctx, path)
    return PendingIntent.getActivity(
      ctx, requestCode, intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  /** Abre o app numa rota do Expo Router (ex.: "ringing", "timer"). */
  fun launchIntent(ctx: Context, path: String): Intent {
    val base = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName) ?: Intent()
    return base.apply {
      action = Intent.ACTION_VIEW
      data = Uri.parse("relogio://$path")
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
    }
  }

  fun canScheduleExact(ctx: Context): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am(ctx).canScheduleExactAlarms()

  private fun setExact(ctx: Context, at: Long, op: PendingIntent) {
    if (canScheduleExact(ctx)) {
      val info = AlarmManager.AlarmClockInfo(at, launchPending(ctx, "alarms", 1))
      am(ctx).setAlarmClock(info, op)
    } else {
      am(ctx).setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, op)
    }
  }

  private fun cancel(ctx: Context, kind: String, id: String) {
    firePending(ctx, kind, id, PendingIntent.FLAG_NO_CREATE)?.let {
      am(ctx).cancel(it)
      it.cancel()
    }
  }

  fun scheduleAlarm(ctx: Context, alarm: Alarm) {
    cancel(ctx, KIND_ALARM, alarm.id)
    if (!alarm.on) return
    val at = alarm.nextOccurrence() ?: return
    setExact(ctx, at, firePending(ctx, KIND_ALARM, alarm.id, PendingIntent.FLAG_UPDATE_CURRENT)!!)
  }

  fun scheduleSnooze(ctx: Context, alarmId: String, minutes: Int) =
    snoozeAt(ctx, alarmId, System.currentTimeMillis() + minutes * 60_000L)

  private fun snoozeAt(ctx: Context, alarmId: String, at: Long) {
    val alarm = Store.alarms(ctx).find { it.id == alarmId } ?: run {
      Store.removeSnooze(ctx, alarmId)
      return
    }
    Store.putSnooze(ctx, alarmId, at)
    setExact(ctx, at, firePending(ctx, KIND_SNOOZE, alarmId, PendingIntent.FLAG_UPDATE_CURRENT)!!)
    Ongoing.showSnooze(ctx, alarmId, alarm.label, at)
    snoozeChanged(ctx)
  }

  fun cancelSnooze(ctx: Context, alarmId: String) {
    cancel(ctx, KIND_SNOOZE, alarmId)
    snoozeDone(ctx, alarmId)
  }

  /** Soneca que tocou ou foi cancelada: some da lista e da notificação. */
  fun snoozeDone(ctx: Context, alarmId: String) {
    Store.removeSnooze(ctx, alarmId)
    Ongoing.cancelSnooze(ctx, alarmId)
    snoozeChanged(ctx)
  }

  /** Atualiza widgets e avisa o app (se estiver aberto) para reler as sonecas. */
  private fun snoozeChanged(ctx: Context) {
    Widgets.updateAll(ctx)
    ctx.sendBroadcast(Intent(RingService.ACTION_RING_CHANGED).setPackage(ctx.packageName).putExtra("event", "onSnoozeChange"))
  }

  fun scheduleTimer(ctx: Context, t: TimerEntry) {
    Store.putTimer(ctx, t)
    cancel(ctx, KIND_TIMER, t.id)
    setExact(ctx, t.endAt, firePending(ctx, KIND_TIMER, t.id, PendingIntent.FLAG_UPDATE_CURRENT)!!)
  }

  fun cancelTimer(ctx: Context, id: String) {
    Store.removeTimer(ctx, id)
    cancel(ctx, KIND_TIMER, id)
  }

  /** Reagenda tudo a partir do que está salvo. Usado no boot e após mudanças de hora. */
  fun rescheduleAll(ctx: Context) {
    Store.alarms(ctx).forEach { scheduleAlarm(ctx, it) }
    val now = System.currentTimeMillis()
    Store.timers(ctx).forEach {
      // timer que venceu com o aparelho desligado dispara logo em seguida
      scheduleTimer(ctx, if (it.endAt < now) it.copy(endAt = now + 2_000) else it)
    }
    Store.snoozes(ctx).forEach { (id, at) -> snoozeAt(ctx, id, maxOf(at, now + 2_000)) }
    Widgets.updateAll(ctx)
  }

  data class NextRing(val at: Long, val alarm: Alarm, val snooze: Boolean)

  /** Próximo toque de alarme deste app, contando sonecas pendentes. */
  fun nextRing(ctx: Context): NextRing? {
    val alarms = Store.alarms(ctx)
    val regular = alarms.filter { it.on }.mapNotNull { a -> a.nextOccurrence()?.let { NextRing(it, a, false) } }
    val snoozes = Store.snoozes(ctx).mapNotNull { (id, at) -> alarms.find { it.id == id }?.let { NextRing(at, it, true) } }
    return (regular + snoozes).minByOrNull { it.at }
  }
}
