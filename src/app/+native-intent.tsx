import { alertCoords, checkRain, rainClient, rainQuery } from '../rainAlert';

// Builds e2e seulement (EXPO_PUBLIC_E2E, inlinée au build) : `weteo://e2e/pluie` lance la
// vérification des alertes pluie sur une pluie simulée à 14:45, sans réseau ni attente de WorkManager.
export async function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  if (!process.env.EXPO_PUBLIC_E2E || !path.includes('e2e/pluie')) return path;
  const coords = await alertCoords();
  if (coords) {
    rainClient.setQueryData(rainQuery(coords.latitude, coords.longitude).queryKey, [
      { time: '2026-11-02T14:30', precipitation: 0 },
      { time: '2026-11-02T14:45', precipitation: 1.2 },
    ]);
    await checkRain();
  }
  return '/';
}
