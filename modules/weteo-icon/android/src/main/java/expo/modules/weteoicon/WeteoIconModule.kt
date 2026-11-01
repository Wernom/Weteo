package expo.modules.weteoicon

import android.content.ComponentName
import android.content.pm.PackageManager
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import expo.modules.kotlin.functions.Queues
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

  // Sans effet sur un alias déjà dans le bon état : rien ne se ferme si l'icône est déjà la bonne.
  private fun applyIcon(name: String) {
    // La nouvelle d'abord : l'app n'est jamais sans entrée dans le lanceur.
    setEnabled(name, true)
    // Toutes les autres : un changement interrompu ne laisse pas deux entrées pour toujours.
    VARIANTS.filter { it != name }.forEach { setEnabled(it, false) }
  }

  private var pending: String? = null

  private val applyOnStop = object : DefaultLifecycleObserver {
    override fun onStop(owner: LifecycleOwner) {
      owner.lifecycle.removeObserver(this)
      // Hors de la promesse, une erreur fermerait l'app pour une simple icône.
      pending?.let { runCatching { applyIcon(it) } }
      pending = null
    }
  }

  override fun definition() = ModuleDefinition {
    Name("WeteoIcon")

    AsyncFunction("setIcon") { name: String ->
      require(name in VARIANTS) { "Unknown icon: $name" }
      // Désactiver l'alias peut fermer sa tâche, et une boîte de permission met l'activité en pause
      // alors qu'elle reste visible : on attend qu'elle soit vraiment arrêtée.
      val lifecycle = (appContext.currentActivity as? LifecycleOwner)?.lifecycle
      if (lifecycle?.currentState?.isAtLeast(Lifecycle.State.STARTED) == true) {
        pending = name
        lifecycle.addObserver(applyOnStop)
      } else {
        applyIcon(name)
      }
    }.runOnQueue(Queues.MAIN)
  }
}
