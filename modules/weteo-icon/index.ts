import { requireNativeModule } from 'expo';

// Change l'icône de l'app dans le lanceur. Les noms sont ceux de plugins/with-weather-icons.js.
// Android seulement.
type WeteoIcon = {
  // Appliquée à l'arrêt de l'activité, pas avant : voir WeteoIconModule.kt.
  setIcon(name: string): Promise<void>;
};

export default requireNativeModule<WeteoIcon>('WeteoIcon');
