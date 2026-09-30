package expo.modules.clocknative

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/** Notificações contínuas de timer e cronômetro enquanto rodam. */
object Ongoing {
  private const val CHANNEL = "ongoing"
  private const val STOPWATCH_ID = 4300

  private fun ensureChannel(ctx: Context) {
    val nm = ctx.getSystemService(NotificationManager::class.java)
    if (nm.getNotificationChannel(CHANNEL) != null) return
    nm.createNotificationChannel(
      NotificationChannel(CHANNEL, "Timers e cronômetro em andamento", NotificationManager.IMPORTANCE_LOW).apply {
        setShowBadge(false)
      },
    )
  }

  private fun timerNotifId(id: String) = 4400 + (id.hashCode() and 0xFFF)

  private fun fmt(ms: Long): String {
    val s = (ms / 1000).coerceAtLeast(0)
    val h = s / 3600
    return if (h > 0) "%d:%02d:%02d".format(h, (s % 3600) / 60, s % 60) else "%02d:%02d".format(s / 60, s % 60)
  }

  fun showTimer(ctx: Context, id: String, label: String, endAt: Long, totalMs: Long, remainingMs: Long, paused: Boolean) {
    if (!NotificationManagerCompat.from(ctx).areNotificationsEnabled()) return
    ensureChannel(ctx)
    val code = timerNotifId(id)
    val name = label.ifBlank { "Timer" }
    val endText = clockText(endAt, Store.settings(ctx).use24)
    val b = NotificationCompat.Builder(ctx, CHANNEL)
      .setSmallIcon(R.drawable.ic_stat_timer)
      .setColor(0xFFC67139.toInt())
      .setOngoing(!paused)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
      .setContentIntent(Scheduler.launchPending(ctx, "timer", code))
      .setProgress(1000, (1000 * remainingMs / totalMs.coerceAtLeast(1)).toInt(), false)
    if (paused) {
      b.setContentTitle("$name · ${fmt(remainingMs)} restantes")
        .setContentText("Pausado")
        .addAction(0, "Retomar", Scheduler.launchPending(ctx, "timer?action=resume&id=$id", code + 1))
    } else {
      b.setContentTitle(name)
        .setContentText("Termina às $endText")
        .setUsesChronometer(true)
        .setChronometerCountDown(true)
        .setShowWhen(true)
        .setWhen(endAt)
        .addAction(0, "Pausar", Scheduler.launchPending(ctx, "timer?action=pause&id=$id", code + 1))
        .addAction(0, "+1 min", Scheduler.launchPending(ctx, "timer?action=add&id=$id", code + 2))
    }
    b.addAction(0, "Cancelar", Scheduler.launchPending(ctx, "timer?action=cancel&id=$id", code + 3))
    NotificationManagerCompat.from(ctx).notify(code, b.build())
  }

  fun cancelTimer(ctx: Context, id: String) {
    NotificationManagerCompat.from(ctx).cancel(timerNotifId(id))
  }

  fun showStopwatch(ctx: Context, elapsedMs: Long, running: Boolean, laps: Int) {
    if (!NotificationManagerCompat.from(ctx).areNotificationsEnabled()) return
    ensureChannel(ctx)
    val b = NotificationCompat.Builder(ctx, CHANNEL)
      .setSmallIcon(R.drawable.ic_stat_stopwatch)
      .setColor(0xFFC67139.toInt())
      .setOngoing(running)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
      .setContentIntent(Scheduler.launchPending(ctx, "stopwatch", STOPWATCH_ID))
      .setContentText("Volta ${laps + 1}")
    if (running) {
      b.setContentTitle("Cronômetro")
        .setUsesChronometer(true)
        .setShowWhen(true)
        .setWhen(System.currentTimeMillis() - elapsedMs)
        .addAction(0, "Pausar", Scheduler.launchPending(ctx, "stopwatch?action=pause", STOPWATCH_ID + 1))
        .addAction(0, "Volta", Scheduler.launchPending(ctx, "stopwatch?action=lap", STOPWATCH_ID + 2))
    } else {
      b.setContentTitle("Cronômetro · ${fmt(elapsedMs)}")
        .setContentText("Pausado")
        .addAction(0, "Retomar", Scheduler.launchPending(ctx, "stopwatch?action=resume", STOPWATCH_ID + 1))
        .addAction(0, "Zerar", Scheduler.launchPending(ctx, "stopwatch?action=reset", STOPWATCH_ID + 3))
    }
    NotificationManagerCompat.from(ctx).notify(STOPWATCH_ID, b.build())
  }

  fun cancelStopwatch(ctx: Context) {
    NotificationManagerCompat.from(ctx).cancel(STOPWATCH_ID)
  }
}
