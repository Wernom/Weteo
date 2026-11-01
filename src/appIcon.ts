import { QueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';

import WeteoIcon from '../modules/weteo-icon';
import { readSettings } from './settings';
import { describeWeather, WEATHER_QUERY_KEY, WeatherData } from './weather';

const DEFAULT_ICON = 'soleil';

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

// Demandée en arrière-plan seulement : sur Android, cet état couvre aussi la simple pause, et le
// module attend l'arrêt de l'activité.
// shortcut: l'icône garde la dernière météo vue de la position (fixe si l'app n'est pas rouverte ou
// la localisation refusée), passer à une tâche périodique si on la veut à jour.
export function syncAppIcon(client: QueryClient) {
  AppState.addEventListener('change', (state) => {
    if (state !== 'background') return;
    const wanted = wantedIcon(client);
    if (wanted) WeteoIcon.setIcon(wanted);
  });
}
