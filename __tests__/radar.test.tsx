import * as MapLibre from '@maplibre/maplibre-react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, userEvent } from '@testing-library/react-native';
import Location from '../modules/weteo-location';
import { Linking } from 'react-native';

import RadarScreen from '../src/app/(tabs)/radar';
import { shownCity } from '../src/favorites';
import radarFixture from '../__fixtures__/rainviewer-weather-maps.json';
import { LOCATION_DENIED, WEATHER_QUERY_KEY } from '../src/weather';
import { LYON, newClient, NICE, respond } from '../jest/helpers';

jest.mock('expo-router', () => ({ useIsFocused: () => true }));

// Ajouté par le mock de jest/setup.ts.
const flyTo = (MapLibre as unknown as { flyTo: jest.Mock }).flyTo;
const location = jest.mocked(Location);
const coords = { latitude: 48.85, longitude: 2.35 };

const renderScreen = (client = newClient()) =>
  render(
    <QueryClientProvider client={client}>
      <RadarScreen />
    </QueryClientProvider>,
  );

const camera = () => screen.getByTestId('camera').props;

describe('Écran Radar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(respond(radarFixture));
  });

  it('centre la carte sur le favori affiché, zoom libre, avec la dernière image radar', async () => {
    shownCity.write(LYON);
    await renderScreen();

    expect(await screen.findByTestId('radar-source')).toHaveProp('tiles', [
      'https://tilecache.rainviewer.com/v2/radar/ae6cacc279ab/256/{z}/{x}/{y}/2/1_1.png',
    ]);
    expect(camera().initialViewState).toEqual({ center: [LYON.longitude, LYON.latitude], zoom: 6 });
    expect(camera().maxZoom).toBeUndefined();
    expect(screen.getByTestId('radar-source')).toHaveProp('maxzoom', 7);
    expect(flyTo).not.toHaveBeenCalled();
  });

  it('suit la ville affichée dans l’onglet Météo', async () => {
    shownCity.write(LYON);
    await renderScreen();
    await screen.findByTestId('radar-source');

    await act(() => shownCity.write(NICE));

    expect(flyTo).toHaveBeenCalledWith({ center: [NICE.longitude, NICE.latitude], zoom: 6 });
  });

  it('va sur ma position dès qu’elle est connue', async () => {
    location.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true });
    location.getLastKnownPositionAsync.mockResolvedValue({ coords });
    await renderScreen();

    // Ouverte sur la France le temps d'obtenir la position.
    expect(camera().initialViewState).toEqual({ center: [2.5, 46.5], zoom: 4 });
    expect(await screen.findByLabelText('Recentrer sur le lieu')).toBeOnTheScreen();
    expect(flyTo).toHaveBeenCalledWith({ center: [coords.longitude, coords.latitude], zoom: 6 });
  });

  it('recentre sur le lieu quand on touche le bouton', async () => {
    const user = userEvent.setup();
    shownCity.write(LYON);
    await renderScreen();

    await user.press(screen.getByLabelText('Recentrer sur le lieu'));

    expect(flyTo).toHaveBeenCalledWith({ center: [LYON.longitude, LYON.latitude], zoom: 6 });
  });

  it('montre la France sans bouton recentrer quand la localisation est refusée', async () => {
    location.requestForegroundPermissionsAsync.mockResolvedValue({ granted: false });
    await renderScreen();

    await screen.findByTestId('radar-source');
    expect(camera().initialViewState).toEqual({ center: [2.5, 46.5], zoom: 4 });
    expect(screen.queryByLabelText('Recentrer sur le lieu')).not.toBeOnTheScreen();
    expect(location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('ne redemande pas la permission déjà refusée sur l’écran Météo', async () => {
    const client = newClient();
    await client.prefetchQuery({
      queryKey: WEATHER_QUERY_KEY,
      queryFn: () => Promise.reject(new Error(LOCATION_DENIED)),
    });
    await renderScreen(client);

    await screen.findByTestId('radar-source');
    expect(camera().initialViewState).toEqual({ center: [2.5, 46.5], zoom: 4 });
    expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('ouvre RainViewer depuis la mention', async () => {
    const user = userEvent.setup();
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    shownCity.write(LYON);
    await renderScreen();

    await user.press(screen.getByRole('link', { name: 'Weather data by RainViewer' }));

    expect(open).toHaveBeenCalledWith('https://www.rainviewer.com/');
  });

  it('garde la carte sans radar quand RainViewer ne répond pas', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 503 } as Response);
    shownCity.write(LYON);
    await renderScreen();

    expect(await screen.findByText('Radar indisponible pour le moment')).toBeOnTheScreen();
    expect(screen.getByTestId('radar-carte')).toBeOnTheScreen();
    expect(screen.queryByTestId('radar-source')).not.toBeOnTheScreen();
  });
});
