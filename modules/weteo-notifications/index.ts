import { requireNativeModule } from 'expo';

// Remplace expo-notifications, qui embarque Firebase (refusé par F-Droid). Android seulement.
type WeteoNotifications = {
  requestPermissionsAsync(): Promise<{ granted: boolean }>;
  // `channel` : nom du canal dans les réglages Android, créé au premier envoi. Sans permission : rien.
  notify(channel: string, title: string, body: string): Promise<void>;
};

export default requireNativeModule<WeteoNotifications>('WeteoNotifications');
