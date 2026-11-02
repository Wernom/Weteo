import { requireNativeModule } from 'expo';

// Remplace expo-notifications, qui embarque Firebase (refusé par F-Droid). Android seulement.
type WeteoNotifications = {
  requestPermissionsAsync(): Promise<{ granted: boolean }>;
};

export default requireNativeModule<WeteoNotifications>('WeteoNotifications');
