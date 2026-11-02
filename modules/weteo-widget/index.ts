import { requireNativeModule } from 'expo';

// Widget d'écran d'accueil Android. L'app lui pousse les valeurs à afficher, gardées par Android.
type WeteoWidget = {
  // `icon` : nom Ionicons de `describeWeather`, dessiné par res/drawable/weteo_widget_<icon>.
  update(place: string, temperature: string, icon: string): void;
  hasWidgets(): boolean;
};

export default requireNativeModule<WeteoWidget>('WeteoWidget');
