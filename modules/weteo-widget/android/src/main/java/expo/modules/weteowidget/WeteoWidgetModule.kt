package expo.modules.weteowidget

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class WeteoWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("WeteoWidget")

    Function("update") { place: String, temperature: String, icon: String ->
      WeteoWidgetProvider.save(appContext.reactContext!!, place, temperature, icon)
    }

    Function("hasWidgets") {
      WeteoWidgetProvider.ids(appContext.reactContext!!).isNotEmpty()
    }
  }
}
