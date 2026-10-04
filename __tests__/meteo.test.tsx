import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { router, useIsFocused } from 'expo-router';
import { AppState, processColor, RefreshControl } from 'react-native';

import WeatherScreen from '../src/app/index';
import forecastFixture from '../__fixtures__/open-meteo-forecast.json';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
}));

const mockNavigation = { setOptions: jest.fn() };
jest.mock('expo-router', () => ({
  router: { navigate: jest.fn() },
  useIsFocused: jest.fn(() => true),
  useNavigation: () => mockNavigation,
}));

const location = jest.mocked(Location);
const coords = { latitude: 48.85, longitude: 2.35 };

function allowLocation() {
  location.requestForegroundPermissionsAsync.mockResolvedValue({
    granted: true,
  } as Location.LocationPermissionResponse);
  location.getCurrentPositionAsync.mockResolvedValue({ coords } as Location.LocationObject);
  location.reverseGeocodeAsync.mockResolvedValue([
    { city: 'Paris' } as Location.LocationGeocodedAddress,
  ]);
}

function newClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
}

function screenTree(client: QueryClient) {
  return (
    <QueryClientProvider client={client}>
      <WeatherScreen />
    </QueryClientProvider>
  );
}

function renderScreen(client = newClient()) {
  return render(screenTree(client));
}

// Fait comme si la météo en cache avait été chargée il y a un peu plus de 10 minutes.
function makeDataOlderThanTenMinutes(client: QueryClient) {
  client.setQueryData(['meteo', 'position'], (data) => data, {
    updatedAt: Date.now() - 10 * 60 * 1000 - 1,
  });
}

const okForecast = { ok: true, json: async () => forecastFixture };

function mockApi(response: Partial<Response> = okForecast) {
  return jest.spyOn(globalThis, 'fetch').mockResolvedValue(response as Response);
}

describe('Écran Météo', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    focusManager.setFocused(undefined);
  });

  it('affiche la météo de ma position', async () => {
    allowLocation();
    mockApi();

    await renderScreen();

    expect(await screen.findByText('Paris')).toBeOnTheScreen();
    expect(screen.getByText('18°')).toBeOnTheScreen();
    expect(screen.getByText('Pluie')).toBeOnTheScreen();
    expect(screen.getByText('Ressenti 17°')).toBeOnTheScreen();
    expect(screen.getByText('Humidité 72%')).toBeOnTheScreen();
    expect(screen.getByText('Vent 14 km/h')).toBeOnTheScreen();
    expect(screen.getByText('Prévisions sur 7 jours')).toBeOnTheScreen();
    expect(screen.getByText("Aujourd'hui")).toBeOnTheScreen();
    expect(screen.getByText('-2° / 4°')).toBeOnTheScreen();
  });

  it('affiche le fond et la barre d’onglets du temps actuel', async () => {
    allowLocation();
    mockApi({
      ok: true,
      json: async () => ({
        ...forecastFixture,
        current: { ...forecastFixture.current, weather_code: 0, is_day: 0 },
      }),
    });

    await renderScreen();

    expect(await screen.findByTestId('fond-meteo')).toHaveProp(
      'colors',
      ['#0f1c3f', '#1f2d5c'].map(processColor),
    );
    expect(mockNavigation.setOptions).toHaveBeenLastCalledWith({
      tabBarStyle: { backgroundColor: '#1f2d5c', borderTopWidth: 0 },
    });
  });

  it('la pluie prime sur le jour pour le fond', async () => {
    allowLocation();
    mockApi();

    await renderScreen();

    expect(await screen.findByTestId('fond-meteo')).toHaveProp(
      'colors',
      ['#4b5a6b', '#2c3644'].map(processColor),
    );
  });

  it("affiche « Ma position » quand la ville n'est pas trouvée", async () => {
    allowLocation();
    location.reverseGeocodeAsync.mockRejectedValue(new Error('géocodage indisponible'));
    mockApi();

    await renderScreen();

    expect(await screen.findByText('Ma position')).toBeOnTheScreen();
  });

  it('ouvre la recherche de ville quand la localisation est refusée', async () => {
    location.requestForegroundPermissionsAsync.mockResolvedValue({
      granted: false,
    } as Location.LocationPermissionResponse);
    const fetchMock = mockApi();

    await renderScreen();

    expect(
      await screen.findByText('Autorise la localisation pour voir la météo autour de toi.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Réessayer')).toBeOnTheScreen();
    expect(router.navigate).toHaveBeenCalledWith('/villes');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ne redemande pas la localisation refusée au retour sur l'app", async () => {
    location.requestForegroundPermissionsAsync.mockResolvedValue({
      granted: false,
    } as Location.LocationPermissionResponse);

    await renderScreen();
    await screen.findByText('Réessayer');
    location.requestForegroundPermissionsAsync.mockClear();
    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });

    expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it("propose de réessayer quand l'API est en erreur, puis affiche la météo", async () => {
    allowLocation();
    const fetchMock = mockApi({ ok: false, status: 500 });
    const user = userEvent.setup();

    await renderScreen();

    expect(await screen.findByText('Open-Meteo a répondu 500')).toBeOnTheScreen();

    fetchMock.mockResolvedValue(okForecast as Response);
    await user.press(screen.getByText('Réessayer'));

    expect(await screen.findByText('Paris')).toBeOnTheScreen();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('affiche une erreur quand il n’y a pas de réseau', async () => {
    allowLocation();
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network request failed'));

    await renderScreen();

    expect(await screen.findByText('Network request failed')).toBeOnTheScreen();
    expect(screen.getByText('Réessayer')).toBeOnTheScreen();
  });

  describe('rafraîchissement', () => {
    async function loadOnce() {
      const client = newClient();
      allowLocation();
      const fetchMock = mockApi();
      const view = await renderScreen(client);
      await screen.findByText('Paris');
      return { fetchMock, view, client };
    }

    it('tirer vers le bas relance toujours un appel, même dans les 10 minutes', async () => {
      const { fetchMock } = await loadOnce();

      // Le mock RN de RefreshControl n'expose rien d'autre que sa dernière instance.
      const pull = (RefreshControl as unknown as { latestRef: RefreshControl }).latestRef;
      await act(async () => pull.props.onRefresh?.());

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    });

    it("revenir sur l'écran dans les 10 minutes ne relance pas d'appel", async () => {
      const { fetchMock, view, client } = await loadOnce();

      await view.unmount();
      await renderScreen(client);

      expect(await screen.findByText('Paris')).toBeOnTheScreen();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("revenir sur l'écran après 10 minutes relance un appel", async () => {
      const { fetchMock, view, client } = await loadOnce();

      await view.unmount();
      makeDataOlderThanTenMinutes(client);
      await renderScreen(client);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    });

    it("revenir sur l'onglet après 10 minutes relance un appel", async () => {
      const { fetchMock, view, client } = await loadOnce();
      const focused = jest.mocked(useIsFocused);

      focused.mockReturnValue(false);
      await view.rerender(screenTree(client));
      makeDataOlderThanTenMinutes(client);
      focused.mockReturnValue(true);
      await view.rerender(screenTree(client));

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    });

    it("rouvrir l'app relance un appel seulement après 10 minutes", async () => {
      const { fetchMock, client } = await loadOnce();
      // Passe par le vrai branchement AppState → focusManager du layout.
      const addListener = jest.spyOn(AppState, 'addEventListener');
      require('../src/app/_layout');
      const onAppStateChange = addListener.mock.calls[0][1];
      const reopenApp = () =>
        act(async () => {
          onAppStateChange('background');
          onAppStateChange('active');
        });

      await reopenApp();
      expect(fetchMock).toHaveBeenCalledTimes(1);

      makeDataOlderThanTenMinutes(client);
      await reopenApp();
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    });
  });
});
