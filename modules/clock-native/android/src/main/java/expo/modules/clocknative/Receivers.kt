package expo.modules.clocknative

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(ctx: Context, intent: Intent) {
    val kind = intent.getStringExtra(Scheduler.EXTRA_KIND) ?: return
    val id = intent.getStringExtra(Scheduler.EXTRA_ID) ?: return
    val settings = Store.settings(ctx)

    val ring: RingInfo = when (kind) {
      Scheduler.KIND_ALARM, Scheduler.KIND_SNOOZE -> {
        val alarms = Store.alarms(ctx)
        val alarm = alarms.find { it.id == id } ?: return
        if (kind == Scheduler.KIND_ALARM) {
          if (alarm.repeats) {
            Scheduler.scheduleAlarm(ctx, alarm)
          } else {
            Store.saveAlarms(ctx, alarms.map { if (it.id == id) it.copy(on = false) else it })
          }
        }
        RingInfo(
          kind = Scheduler.KIND_ALARM, id = alarm.id, label = alarm.label.ifBlank { "Alarme" },
          time = clockText(alarm.h, alarm.m, settings.use24), sound = alarm.sound, vibrate = alarm.vibrate, gradual = alarm.gradual,
          snoozeMin = settings.snoozeMin,
        )
      }
      Scheduler.KIND_TIMER -> {
        val t = Store.timers(ctx).find { it.id == id } ?: return
        Store.removeTimer(ctx, id)
        RingInfo(
          kind = Scheduler.KIND_TIMER, id = t.id, label = t.label.ifBlank { "Timer" },
          time = "", sound = settings.timerSound, vibrate = settings.timerVibrate, gradual = false,
          snoozeMin = settings.snoozeMin,
        )
      }
      else -> return
    }

    Widgets.updateAll(ctx)
    ContextCompat.startForegroundService(ctx, RingService.startIntent(ctx, ring))
  }
}

class BootReceiver : BroadcastReceiver() {
  override fun onReceive(ctx: Context, intent: Intent) {
    Scheduler.rescheduleAll(ctx)
  }
}
