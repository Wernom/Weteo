package expo.modules.weteoicon

import android.content.ComponentName
import android.content.pm.PackageManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Mêmes noms que dans plugins/with-weather-icons.js. Le premier est activé dans le manifeste.
private val VARIANTS = listOf("soleil", "nuages", "pluie", "neige", "orage", "nuit")

// Chaque icône est une activity-alias de MainActivity : on active celle qu'on veut afficher.
class WeteoIconModule : Module() {
  private val context
    get() = appContext.reactContext!!

  private fun alias(variant: String) =
    ComponentName(context.packageName, "${context.packageName}.Icon_$variant")

  private fun setEnabled(variant: String, enabled: Boolean) =
    context.packageManager.setComponentEnabledSetting(
      alias(variant),
      if (enabled) PackageManager.COMPONENT_ENABLED_STATE_ENABLED else PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
      PackageManager.DONT_KILL_APP
    )

  private fun currentIcon() =
    VARIANTS.firstOrNull {
      context.packageManager.getComponentEnabledSetting(alias(it)) == PackageManager.COMPONENT_ENABLED_STATE_ENABLED
    } ?: VARIANTS.first()

  override fun definition() = ModuleDefinition {
    Name("WeteoIcon")

    Function("getIcon") { currentIcon() }

    Function("setIcon") { name: String ->
      require(name in VARIANTS) { "Unknown icon: $name" }
      val previous = currentIcon()
      if (name == previous) return@Function
      // La nouvelle d'abord : l'app n'est jamais sans entrée dans le lanceur.
      setEnabled(name, true)
      setEnabled(previous, false)
    }
  }
}
