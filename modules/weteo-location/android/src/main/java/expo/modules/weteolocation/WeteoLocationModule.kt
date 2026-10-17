package expo.modules.weteolocation

import android.Manifest
import android.content.Context
import android.location.Geocoder
import android.location.Location
import android.location.LocationManager
import android.os.CancellationSignal
import android.os.SystemClock
import androidx.core.content.ContextCompat
import androidx.core.location.LocationManagerCompat
import androidx.core.os.bundleOf
import androidx.core.util.Consumer
import expo.modules.interfaces.permissions.Permissions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Localisation sans Google Play Services : seulement les fournisseurs du système.
class WeteoLocationModule : Module() {
  private val locationManager
    get() = appContext.reactContext!!.getSystemService(Context.LOCATION_SERVICE) as LocationManager

  override fun definition() = ModuleDefinition {
    Name("WeteoLocation")

    AsyncFunction("requestForegroundPermissionsAsync") { promise: Promise ->
      Permissions.askForPermissionsWithPermissionsManager(
        appContext.permissions,
        promise,
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION
      )
    }

    AsyncFunction("getLastKnownPositionAsync") { maxAge: Double ->
      locationManager.getProviders(true)
        .mapNotNull { runCatching { locationManager.getLastKnownLocation(it) }.getOrNull() }
        .maxByOrNull { it.elapsedRealtimeNanos }
        ?.takeIf { ageMillis(it) <= maxAge }
        ?.let(::toPosition)
    }

    AsyncFunction("getCurrentPositionAsync") { promise: Promise ->
      // « fused » (AOSP, Android 12+) mêle GPS et réseau ; sinon le réseau, plus rapide que le GPS.
      val enabled = locationManager.getProviders(true)
      val provider = listOf("fused", LocationManager.NETWORK_PROVIDER, LocationManager.GPS_PROVIDER)
        .firstOrNull { it in enabled }
        ?: return@AsyncFunction promise.reject("ERR_LOCATION_DISABLED", "Location services are disabled", null)
      try {
        LocationManagerCompat.getCurrentLocation(locationManager, provider, null as CancellationSignal?, ContextCompat.getMainExecutor(appContext.reactContext!!), Consumer<Location?> { location ->
          if (location == null) promise.reject("ERR_LOCATION_UNAVAILABLE", "No location fix", null)
          else promise.resolve(toPosition(location))
        })
      } catch (e: SecurityException) {
        promise.reject("ERR_LOCATION_DENIED", e.message, e)
      }
    }

    AsyncFunction("reverseGeocodeAsync") { latitude: Double, longitude: Double ->
      if (!Geocoder.isPresent()) return@AsyncFunction emptyList<Map<String, String?>>()
      @Suppress("DEPRECATION")
      (Geocoder(appContext.reactContext!!).getFromLocation(latitude, longitude, 1) ?: emptyList())
        .map { mapOf("city" to it.locality, "region" to it.adminArea) }
    }
  }

  private fun ageMillis(location: Location) =
    (SystemClock.elapsedRealtimeNanos() - location.elapsedRealtimeNanos) / 1_000_000

  private fun toPosition(location: Location) =
    bundleOf("coords" to bundleOf("latitude" to location.latitude, "longitude" to location.longitude))
}
