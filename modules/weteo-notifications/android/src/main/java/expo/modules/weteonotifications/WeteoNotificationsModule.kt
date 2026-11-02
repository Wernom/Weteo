package expo.modules.weteonotifications

import android.Manifest
import android.os.Build
import androidx.core.app.NotificationManagerCompat
import androidx.core.os.bundleOf
import expo.modules.interfaces.permissions.Permissions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

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
  }
}
