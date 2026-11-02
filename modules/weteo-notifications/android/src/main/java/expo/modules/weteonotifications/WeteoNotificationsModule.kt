package expo.modules.weteonotifications

import android.Manifest
import android.app.PendingIntent
import android.os.Build
import androidx.core.app.NotificationChannelCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.os.bundleOf
import expo.modules.interfaces.permissions.Permissions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val CHANNEL_ID = "pluie"
// Un seul identifiant : une nouvelle alerte remplace la précédente au lieu de s'empiler.
private const val NOTIFICATION_ID = 1

// Notifications sans Firebase : seulement celles du système.
class WeteoNotificationsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("WeteoNotifications")

    AsyncFunction("requestPermissionsAsync") { promise: Promise ->
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        Permissions.askForPermissionsWithPermissionsManager(
          appContext.permissions,
          promise,
          Manifest.permission.POST_NOTIFICATIONS
        )
      } else {
        // Avant Android 13, pas de demande : seul l'interrupteur système de l'app compte.
        val granted = NotificationManagerCompat.from(appContext.reactContext!!).areNotificationsEnabled()
        promise.resolve(bundleOf("granted" to granted))
      }
    }

    AsyncFunction("notify") { channel: String, title: String, body: String ->
      val context = appContext.reactContext!!
      val manager = NotificationManagerCompat.from(context)
      // Permission retirée ou notifications coupées depuis : on n'insiste pas.
      if (!manager.areNotificationsEnabled()) return@AsyncFunction
      // Recréer le canal met à jour son nom, qui suit la langue de l'app.
      manager.createNotificationChannel(
        NotificationChannelCompat.Builder(CHANNEL_ID, NotificationManagerCompat.IMPORTANCE_DEFAULT)
          .setName(channel)
          .build()
      )
      // Icône monochrome « pluie » générée par plugins/with-weather-icons.js.
      val icon = context.resources.getIdentifier("ic_weteo_pluie_monochrome", "mipmap", context.packageName)
        .takeIf { it != 0 } ?: context.applicationInfo.icon
      val open = context.packageManager.getLaunchIntentForPackage(context.packageName)?.let {
        PendingIntent.getActivity(context, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
      }
      val notification = NotificationCompat.Builder(context, CHANNEL_ID)
        .setSmallIcon(icon)
        .setContentTitle(title)
        .setContentText(body)
        .setContentIntent(open)
        .setAutoCancel(true)
        .build()
      try {
        manager.notify(NOTIFICATION_ID, notification)
      } catch (_: SecurityException) {
        // Permission retirée entre la vérification et l'envoi.
      }
    }
  }
}
