import { requireNativeModule } from 'expo';

// Remplace expo-location, qui embarque Google Play Services (refusé par F-Droid) :
// LocationManager et Geocoder d'Android suffisent. Android seulement.
type Position = { coords: { latitude: number; longitude: number } };
type Address = { city?: string | null; region?: string | null };

type WeteoLocation = {
  requestForegroundPermissionsAsync(): Promise<{ granted: boolean }>;
  // `null` si aucune position de moins de `maxAge` ms n'est connue.
  getLastKnownPositionAsync(maxAge: number): Promise<Position | null>;
  getCurrentPositionAsync(): Promise<Position>;
  reverseGeocodeAsync(latitude: number, longitude: number): Promise<Address[]>;
};

export default requireNativeModule<WeteoLocation>('WeteoLocation');
