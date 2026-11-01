import { QueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';

import WeteoIcon from '../modules/weteo-icon';
import { readSettings } from './settings';
import { describeWeather, WEATHER_QUERY_KEY, WeatherData } from './weather';

export const DEFAULT_ICON = 'soleil';

// Les temps à thème propre ont leur icône ; sinon ciel clair (0-1) ou nuageux.
export function weatherIcon(code: number, isDay: boolean) {
  const { theme } = describeWeather(code, isDay);
  if (theme !== 'jour' && theme !== 'nuit') return theme;
  if (code > 1) return 'nuages';
  return isDay ? DEFAULT_ICON : 'nuit';
}

// `undefined` tant que la météo de la position n'est pas connue : l'icône ne bouge pas.
function wantedIcon(client: QueryClient) {
  if (!readSettings().weatherIcon) return DEFAULT_ICON;
  const current = client.getQueryData<WeatherData>(WEATHER_QUERY_KEY)?.forecast.current;
  return current && weatherIcon(current.weatherCode, current.isDay);
}

// Changée en arrière-plan seulement : le système peut fermer la tâche de l'alias désactivé.
export function syncAppIcon(client: QueryClient) {
  AppState.addEventListener('change', (state) => {
    if (state !== 'background') return;
    const wanted = wantedIcon(client);
    if (wanted && wanted !== WeteoIcon.getIcon()) WeteoIcon.setIcon(wanted);
  });
}
