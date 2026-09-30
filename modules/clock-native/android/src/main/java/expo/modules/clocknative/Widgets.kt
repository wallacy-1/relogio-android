package expo.modules.clocknative

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.text.format.DateFormat
import android.view.View
import android.widget.RemoteViews
import java.util.Locale

/**
 * Base dos widgets: hora e data andam sozinhas (TextClock/AnalogClock); aqui só o clique, o formato
 * 12/24 h escolhido no app (em vez do do sistema) e o próximo alarme.
 */
abstract class ClockWidget(
  private val layout: Int,
  private val route: String,
  private val time12: String,
  private val time24: String,
) : AppWidgetProvider() {
  override fun onUpdate(ctx: Context, manager: AppWidgetManager, ids: IntArray) {
    ids.forEach { manager.updateAppWidget(it, build(ctx)) }
  }

  fun build(ctx: Context): RemoteViews = RemoteViews(ctx.packageName, layout).apply {
    setOnClickPendingIntent(R.id.w_root, Scheduler.launchPending(ctx, route, 100 + layout.hashCode() % 100))
    val use24 = Store.settings(ctx).use24
    val timePattern = if (use24) time24 else time12
    setCharSequence(R.id.w_time, "setFormat12Hour", timePattern)
    setCharSequence(R.id.w_time, "setFormat24Hour", timePattern)
    if (layout == R.layout.widget_digital_large) {
      val pattern = longDatePattern()
      setCharSequence(R.id.w_date, "setFormat12Hour", pattern)
      setCharSequence(R.id.w_date, "setFormat24Hour", pattern)
      val next = Scheduler.nextAlarm(ctx)
      if (next == null) {
        setViewVisibility(R.id.w_alarm_row, View.GONE)
      } else {
        setViewVisibility(R.id.w_alarm_row, View.VISIBLE)
        val a = next.second
        val time = clockText(a.h, a.m, use24)
        setTextViewText(R.id.w_next_alarm, if (a.label.isBlank()) time else "$time · ${a.label}")
      }
    }
  }
}

/** "quarta-feira, 30 de setembro" em português; nos outros idiomas, o padrão do sistema. */
private fun longDatePattern(): String {
  val locale = Locale.getDefault()
  return if (locale.language == "pt") "EEEE, d 'de' MMMM" else DateFormat.getBestDateTimePattern(locale, "EEEEdMMMM")
}

class DigitalLargeWidget : ClockWidget(R.layout.widget_digital_large, "alarms", "h:mm", "HH:mm")
class AnalogWidget : ClockWidget(R.layout.widget_analog, "", "h:mm", "HH:mm")
class DigitalSmallWidget : ClockWidget(R.layout.widget_digital_small, "", "hh", "HH")
class DigitalBarWidget : ClockWidget(R.layout.widget_digital_bar, "", "h:mm", "HH:mm")
class AnalogLargeWidget : ClockWidget(R.layout.widget_analog_large, "", "h:mm a", "HH:mm")

object Widgets {
  private val providers: List<Pair<Class<out ClockWidget>, () -> ClockWidget>> = listOf(
    DigitalLargeWidget::class.java to ::DigitalLargeWidget,
    AnalogWidget::class.java to ::AnalogWidget,
    DigitalSmallWidget::class.java to ::DigitalSmallWidget,
    DigitalBarWidget::class.java to ::DigitalBarWidget,
    AnalogLargeWidget::class.java to ::AnalogLargeWidget,
  )

  fun updateAll(ctx: Context) {
    val manager = AppWidgetManager.getInstance(ctx)
    providers.forEach { (cls, make) ->
      val ids = manager.getAppWidgetIds(ComponentName(ctx, cls))
      if (ids.isNotEmpty()) make().onUpdate(ctx, manager, ids)
    }
  }
}
