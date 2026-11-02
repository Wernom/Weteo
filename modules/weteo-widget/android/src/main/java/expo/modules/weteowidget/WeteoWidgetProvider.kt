package expo.modules.weteowidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.widget.RemoteViews

private const val PREFS = "weteo-widget"

// Affiche les dernières valeurs poussées par l'app : un widget posé ou un téléphone redémarré
// montre la dernière météo connue, sans attendre la tâche de fond.
class WeteoWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    manager.updateAppWidget(ids, views(context))
  }

  companion object {
    fun ids(context: Context): IntArray =
      AppWidgetManager.getInstance(context)
        .getAppWidgetIds(ComponentName(context, WeteoWidgetProvider::class.java))

    fun save(context: Context, place: String, temperature: String, icon: String) {
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
        .putString("place", place)
        .putString("temperature", temperature)
        .putString("icon", icon)
        .apply()
      AppWidgetManager.getInstance(context).updateAppWidget(ids(context), views(context))
    }

    private fun views(context: Context): RemoteViews {
      val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      val views = RemoteViews(context.packageName, R.layout.weteo_widget)
      views.setTextViewText(R.id.weteo_widget_place, prefs.getString("place", ""))
      views.setTextViewText(R.id.weteo_widget_temperature, prefs.getString("temperature", "—"))
      // Pictogrammes Ionicons de l'app, convertis dans res/drawable (« partly-sunny » → weteo_widget_partly_sunny).
      val name = prefs.getString("icon", null)?.replace('-', '_')
      val icon = context.resources.getIdentifier("weteo_widget_$name", "drawable", context.packageName)
        .takeIf { it != 0 } ?: R.drawable.weteo_widget_partly_sunny
      views.setImageViewResource(R.id.weteo_widget_icon, icon)
      context.packageManager.getLaunchIntentForPackage(context.packageName)?.let {
        val open = PendingIntent.getActivity(context, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        views.setOnClickPendingIntent(R.id.weteo_widget, open)
      }
      return views
    }
  }
}
