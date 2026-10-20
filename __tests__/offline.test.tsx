import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import Location from '../modules/weteo-location';

import WeatherScreen from '../src/app/(tabs)/index';
import { toggleFavorite } from '../src/favorites';
import { formatAge } from '../src/i18n';
import { persistWeather } from '../src/offline';
import { cityQueryKey, fetchForecast, WEATHER_QUERY_KEY } from '../src/weather';
import { LYON, mockFetch, newClient, NICE } from '../jest/helpers';

jest.mock('expo-router', () => ({
  router: { navigate: jest.fn(), push: jest.fn(), setParams: jest.fn() },
  useIsFocused: () => true,
  useLocalSearchParams: () => ({}),
}));

const HOUR = 60 * 60 * 1000;

// Client tel qu'au lancement de l'app : cache restauré depuis le téléphone.
function launch() {
  const client = newClient();
  persistWeather(client);
  return client;
}

async function forecast() {
  mockFetch();
  return fetchForecast(LYON.latitude, LYON.longitude);
}

describe('Hors ligne', () => {
  it('retrouve au lancement la météo de ma position et des favoris, avec son heure', async () => {
    const data = { forecast: await forecast(), place: 'Paris' };
    toggleFavorite(LYON);
    const before = launch();
    const updatedAt = Date.now() - 2 * HOUR;
    before.setQueryData(WEATHER_QUERY_KEY, data, { updatedAt });
    before.setQueryData(cityQueryKey(String(LYON.id)), { ...data, place: 'Lyon' });
    // Ville consultée sans être favorite : pas gardée.
    before.setQueryData(cityQueryKey(String(NICE.id)), { ...data, place: 'Nice' });

    const after = launch();

    expect(after.getQueryData(WEATHER_QUERY_KEY)).toEqual(data);
    expect(after.getQueryState(WEATHER_QUERY_KEY)?.dataUpdatedAt).toBe(updatedAt);
    expect(after.getQueryData(cityQueryKey(String(LYON.id)))).toBeDefined();
    expect(after.getQueryData(cityQueryKey(String(NICE.id)))).toBeUndefined();
  });

  it('sans réseau, affiche la dernière météo et son âge, sans écran d’erreur', async () => {
    const data = { forecast: await forecast(), place: 'Paris' };
    launch().setQueryData(WEATHER_QUERY_KEY, data, { updatedAt: Date.now() - 2 * HOUR });
    const location = jest.mocked(Location);
    location.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true });
    location.getCurrentPositionAsync.mockResolvedValue({ coords: LYON });
    location.reverseGeocodeAsync.mockResolvedValue([]);
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network request failed'));

    await render(
      <QueryClientProvider client={launch()}>
        <WeatherScreen />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Mis à jour il y a 2 h')).toBeOnTheScreen();
    expect(screen.getByText('Paris')).toBeOnTheScreen();
    expect(screen.queryByText('Réessayer')).not.toBeOnTheScreen();
  });

  it('dit depuis combien de temps la météo date', () => {
    const ago = (ms: number) => formatAge(Date.now() - ms);
    expect(ago(30_000)).toBe('Mis à jour il y a 1 min');
    expect(ago(90 * 60_000)).toBe('Mis à jour il y a 1 h');
    expect(ago(25 * HOUR)).toBe('Mis à jour il y a 1 jour');
    expect(ago(49 * HOUR)).toBe('Mis à jour il y a 2 jours');
  });
});
