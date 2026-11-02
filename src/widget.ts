import { hashKey, QueryClient } from '@tanstack/react-query';
import { BackgroundTaskResult } from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import Location from '../modules/weteo-location';
import Widget from '../modules/weteo-widget';
import { refreshAppIcon } from './appIcon';
import { readFavorites } from './favorites';
import i18n from './i18n';
import { readSettings, TemperatureUnit } from './settings';
import { formatDegrees, toTemperature } from './units';
import {
  cityQueryKey,
  describeWeather,
  fetchForecast,
  WEATHER_QUERY_KEY,
  weatherAt,
  WeatherData,
} from './weather';

export const WIDGET_TASK = 'widget-meteo';

export function widgetSnapshot(
  { forecast: { current }, place }: WeatherData,
  unit: TemperatureUnit,
) {
  return {
    place: place ?? i18n.t('meteo.maPosition'),
    temperature: formatDegrees(toTemperature(current.temperature, unit)),
    icon: describeWeather(current.weatherCode, current.isDay).icon,
  };
}

function updateWidget(data: WeatherData) {
  const { place, temperature, icon } = widgetSnapshot(data, readSettings().temperature);
  Widget.update(place, temperature, icon);
}

// Favori choisi dans les réglages ; `null` (ma position) s'il n'est plus favori.
function widgetCity() {
  const { widgetCity } = readSettings();
  return readFavorites().find((f) => f.id === widgetCity) ?? null;
}

const widgetQueryKey = () => {
  const city = widgetCity();
  return city ? cityQueryKey(String(city.id)) : WEATHER_QUERY_KEY;
};

// Dernière météo gardée du lieu du widget ; `false` si l'app ne l'a pas encore chargée.
export function showCachedWeather(client: QueryClient) {
  const cached = client.getQueryData<WeatherData>(widgetQueryKey());
  if (cached) updateWidget(cached);
  return cached !== undefined;
}

// Le lieu du widget, dès l'ouverture (cache hors ligne) puis à chaque chargement réussi.
export function syncWidget(client: QueryClient) {
  showCachedWeather(client);
  client.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated' || event.action.type !== 'success') return;
    if (event.query.queryHash === hashKey(widgetQueryKey())) updateWidget(event.query.state.data);
  });
}

// Tâche de fond. Pour ma position, sans permission à demander : la dernière position connue, quel
// que soit son âge (plus récente que celle du widget). Sans position, le widget garde son affichage.
export async function refreshWidget() {
  if (!Widget.hasWidgets()) return;
  const city = widgetCity();
  if (city) {
    const forecast = await fetchForecast(city.latitude, city.longitude);
    return updateWidget({ forecast, place: city.name });
  }
  const position = await Location.getLastKnownPositionAsync(Number.MAX_VALUE).catch(() => null);
  if (position) updateWidget(await weatherAt(position.coords));
}

// Porte aussi l'icône météo (US 5.4) : la tâche des alertes pluie n'existe que si elles sont actives.
// Chacune va au bout même si l'autre échoue.
TaskManager.defineTask(WIDGET_TASK, async () => {
  const results = await Promise.allSettled([refreshWidget(), refreshAppIcon()]);
  return results.some((r) => r.status === 'rejected')
    ? BackgroundTaskResult.Failed
    : BackgroundTaskResult.Success;
});
