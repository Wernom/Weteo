import { requireNativeModule } from 'expo';

// Change l'icône de l'app dans le lanceur. Les noms sont ceux de plugins/with-weather-icons.js.
// Android seulement.
type WeteoIcon = {
  getIcon(): string;
  setIcon(name: string): void;
};

export default requireNativeModule<WeteoIcon>('WeteoIcon');
