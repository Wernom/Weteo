import { QueryClient, queryOptions } from '@tanstack/react-query';
import { BackgroundTaskResult } from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import Location from '../modules/weteo-location';
import Notifications from '../modules/weteo-notifications';

import { readFavorites } from './favorites';
import i18n from './i18n';
import { readSettings } from './settings';
import { createStore } from './store';
import { fetchRain, shouldRetry, TEN_MINUTES } from './weather';

// Vérifie la pluie à venir toutes les 15 min environ (WorkManager), sans serveur.
export const RAIN_TASK = 'alerte-pluie';

// En dessous, quelques gouttes en 15 min : pas de quoi prévenir.
const RAIN_THRESHOLD = 0.1;
const ONE_HOUR = 60 * 60 * 1000;

type RainSlot = { time: string; precipitation: number };

// Une seule alerte par épisode : `alerted` reste vrai tant que de la pluie est prévue, et retombe
// dès que les 2 heures à venir sont sèches.
export function rainRule(slots: RainSlot[], alerted: boolean) {
  const rain = slots.find((s) => s.precipitation >= RAIN_THRESHOLD);
  return { notifyAt: rain && !alerted ? rain.time : null, alerted: rain !== undefined };
}

// Épisode de pluie déjà annoncé.
const alertedStore = createStore<boolean>('alertePluie', (stored) => stored ?? false);

// Propre à la tâche : elle peut tourner sans écran, donc sans le client de l'app.
export const rainClient = new QueryClient({ defaultOptions: { queries: { retry: shouldRetry } } });

export const rainQuery = (latitude: number, longitude: number) =>
  queryOptions({
    queryKey: ['pluie', latitude, longitude],
    queryFn: () => fetchRain(latitude, longitude),
    staleTime: TEN_MINUTES,
  });

// Position récente du téléphone, sinon la ville choisie dans Réglages, sinon pas d'alerte.
export async function alertCoords() {
  const position = await Location.getLastKnownPositionAsync(ONE_HOUR).catch(() => null);
  if (position) return position.coords;
  const { rainAlertCity } = readSettings();
  return readFavorites().find((f) => f.id === rainAlertCity) ?? null;
}

export async function checkRain() {
  if (!readSettings().rainAlerts) return;
  const coords = await alertCoords();
  if (!coords) return;
  const slots = await rainClient.fetchQuery(rainQuery(coords.latitude, coords.longitude));
  const { notifyAt, alerted } = rainRule(slots, alertedStore.read());
  if (notifyAt) {
    await Notifications.notify(
      i18n.t('reglages.alertesPluie'),
      i18n.t('alertePluie.titre'),
      // Heure locale du lieu, comme partout dans l'app.
      i18n.t('alertePluie.texte', { heure: notifyAt.slice(11, 16) }),
    );
  }
  alertedStore.write(alerted);
}

// Au niveau du module : la tâche peut démarrer l'app sans écran (voir index.ts).
TaskManager.defineTask(RAIN_TASK, async () => {
  try {
    await checkRain();
    return BackgroundTaskResult.Success;
  } catch {
    return BackgroundTaskResult.Failed;
  }
});
