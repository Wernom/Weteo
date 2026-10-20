import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
  within,
} from '@testing-library/react-native';
import Location from '../modules/weteo-location';
import { router, useIsFocused } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';
import {
  AppState,
  Dimensions,
  FlatList,
  processColor,
  RefreshControl,
  ScrollView,
} from 'react-native';

import WeatherScreen from '../src/app/(tabs)/index';
import { toggleFavorite } from '../src/favorites';
import { PALETTES, tabBarTheme } from '../src/theme';
import { TEN_MINUTES, WEATHER_QUERY_KEY } from '../src/weather';
import forecastFixture from '../__fixtures__/open-meteo-forecast.json';
import {
  forecastCalls,
  LYON,
  mockFetch as mockApi,
  newClient,
  NICE,
  respond,
} from '../jest/helpers';

let mockParams: { page?: string } = {};
jest.mock('expo-router', () => ({
  router: { navigate: jest.fn(), push: jest.fn(), setParams: jest.fn() },
  useIsFocused: jest.fn(() => true),
  useLocalSearchParams: () => mockParams,
}));

const location = jest.mocked(Location);
const coords = { latitude: 48.85, longitude: 2.35 };

function allowLocation() {
  location.requestForegroundPermissionsAsync.mockResolvedValue({
    granted: true,
  });
  location.getCurrentPositionAsync.mockResolvedValue({ coords });
  location.reverseGeocodeAsync.mockResolvedValue([{ city: 'Paris' }]);
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
  client.setQueryData(WEATHER_QUERY_KEY, (data) => data, {
    updatedAt: Date.now() - TEN_MINUTES - 1,
  });
}

describe('Écran Météo', () => {
  afterEach(() => {
    focusManager.setFocused(undefined);
  });

  it('affiche la météo de ma position', async () => {
    allowLocation();
    mockApi();

    await renderScreen();

    expect(await screen.findByText('Paris')).toBeOnTheScreen();
    expect(
      within(screen.getByTestId('mention-position')).getByText('Ma position'),
    ).toBeOnTheScreen();
    expect(screen.getByText('18°')).toBeOnTheScreen();
    expect(screen.getByText('Pluie')).toBeOnTheScreen();
    expect(screen.getByText('Ressenti 17°')).toBeOnTheScreen();
    expect(screen.getByText('Humidité 72 %')).toBeOnTheScreen();
    expect(screen.getByText('Vent 14 km/h')).toBeOnTheScreen();
  });

  it('affiche les valeurs dans les unités des réglages', async () => {
    Storage.setItemSync('reglages', JSON.stringify({ temperature: 'fahrenheit', wind: 'mph' }));
    allowLocation();
    mockApi();

    await renderScreen();

    expect(await screen.findByText('65°')).toBeOnTheScreen();
    expect(screen.getByText('Ressenti 62°')).toBeOnTheScreen();
    expect(screen.getByText('Vent 9 mph')).toBeOnTheScreen();
  });

  it('affiche les 7 prochains jours avec icône, minimum et maximum', async () => {
    allowLocation();
    mockApi();

    await renderScreen();

    expect(await screen.findByText('Prévisions sur 7 jours')).toBeOnTheScreen();
    const today = within(screen.getByTestId('jour-0'));
    expect(today.getByText("Aujourd'hui")).toBeOnTheScreen();
    expect(today.getByText('11°')).toBeOnTheScreen();
    expect(today.getByText('19°')).toBeOnTheScreen();
    expect(screen.getByTestId('jour-1')).toHaveAccessibleName(
      'Mardi, Couvert, minimum 10°, maximum 17°',
    );
    expect(screen.getByTestId('jour-6')).toHaveAccessibleName(
      'Dimanche, Neige, minimum -2°, maximum 4°',
    );
    expect(screen.queryByTestId('jour-7')).not.toBeOnTheScreen();
  });

  it('toucher un jour ouvre son détail', async () => {
    allowLocation();
    mockApi();
    const user = userEvent.setup();

    await renderScreen();
    await user.press(await screen.findByTestId('jour-1'));

    expect(router.push).toHaveBeenCalledWith('/jour/2026-10-06');
  });

  it('affiche les 48 prochaines heures en commençant par maintenant', async () => {
    allowLocation();
    mockApi();

    await renderScreen();

    expect(await screen.findByText('Heure par heure')).toBeOnTheScreen();
    const now = within(screen.getByTestId('heure-0'));
    expect(now.getByText('Maintenant')).toBeOnTheScreen();
    expect(now.getByText('16°')).toBeOnTheScreen();
    expect(now.getByText(/80 %/)).toBeOnTheScreen();
    expect(screen.getByTestId('heure-1')).toHaveAccessibleName('15 h, Pluie, 16°, pluie 70 %');
    expect(screen.getByTestId('heure-47')).toHaveAccessibleName(
      '13 h, Ciel dégagé, 16°, pluie 0 %',
    );
    expect(screen.queryByTestId('heure-48')).not.toBeOnTheScreen();
  });

  it("affiche la qualité de l'air : indice, palier et sa couleur", async () => {
    allowLocation();
    mockApi();

    await renderScreen();

    const air = within(await screen.findByTestId('qualite-air'));
    expect(air.getByText('36')).toBeOnTheScreen();
    expect(air.getByText('Correct')).toBeOnTheScreen();
    expect(screen.getByTestId('qualite-air')).toHaveAccessibleName("Qualité de l'air 36, Correct");
    expect(screen.getByTestId('pastille-air')).toHaveStyle({
      backgroundColor: PALETTES.light.airQuality[1],
    });
  });

  it("détaille les polluants de l'air", async () => {
    allowLocation();
    mockApi();

    await renderScreen();

    expect(await screen.findByText('PM2.5')).toBeOnTheScreen();
    expect(screen.getByText('NO₂')).toBeOnTheScreen();
    expect(screen.getByTestId('polluant-pm2_5')).toHaveAccessibleName(
      'Particules fines PM2.5, 7 microgrammes par mètre cube, Correct',
    );
    expect(screen.getByTestId('polluant-sulphur_dioxide')).toHaveAccessibleName(
      'Dioxyde de soufre, 1 microgramme par mètre cube, Bon',
    );
  });

  it("affiche la qualité de l'air heure par heure, sans les heures inconnues", async () => {
    allowLocation();
    mockApi();

    await renderScreen();

    const now = within(await screen.findByTestId('air-heure-0'));
    expect(now.getByText('Maintenant')).toBeOnTheScreen();
    expect(screen.getByTestId('air-heure-1')).toHaveAccessibleName(
      "15 h, qualité de l'air 41, Moyen",
    );
    // 16 h n'a pas d'indice dans le fixture.
    expect(screen.queryByTestId('air-heure-2')).not.toBeOnTheScreen();
    expect(screen.getByTestId('air-heure-3')).toBeOnTheScreen();
  });

  it("affiche la météo sans la qualité de l'air quand son service est en panne", async () => {
    allowLocation();
    jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (url) =>
        String(url).includes('air-quality')
          ? ({ ok: false, status: 500 } as Response)
          : respond(forecastFixture),
      );

    await renderScreen();

    expect(await screen.findByText('Paris')).toBeOnTheScreen();
    expect(screen.queryByText("Qualité de l'air")).not.toBeOnTheScreen();
  });

  it('affiche le fond et la barre d’onglets du temps actuel', async () => {
    allowLocation();
    mockApi(
      respond({
        ...forecastFixture,
        current: { ...forecastFixture.current, weather_code: 0, is_day: 0 },
      }),
    );

    await renderScreen();

    expect(await screen.findByTestId('fond-meteo')).toHaveProp(
      'colors',
      PALETTES.light.gradients.nuit.map(processColor),
    );
    expect(tabBarTheme.read()).toBe('nuit');
  });

  it('la pluie prime sur le jour pour le fond', async () => {
    allowLocation();
    mockApi();

    await renderScreen();

    expect(await screen.findByTestId('fond-meteo')).toHaveProp(
      'colors',
      PALETTES.light.gradients.pluie.map(processColor),
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
    });
    const fetchMock = mockApi();

    await renderScreen();

    expect(
      await screen.findByText('Autorisez la localisation pour voir la météo autour de vous.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Réessayer')).toBeOnTheScreen();
    expect(router.navigate).toHaveBeenCalledWith('/villes');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ne redemande pas la localisation refusée au retour sur l'app", async () => {
    location.requestForegroundPermissionsAsync.mockResolvedValue({
      granted: false,
    });

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

    expect(
      await screen.findByText('Le service météo est indisponible pour le moment.'),
    ).toBeOnTheScreen();

    fetchMock.mockResolvedValue(respond(forecastFixture));
    await user.press(screen.getByText('Réessayer'));

    expect(await screen.findByText('Paris')).toBeOnTheScreen();
    expect(forecastCalls(fetchMock)).toHaveLength(2);
  });

  it('affiche une erreur quand il n’y a pas de réseau', async () => {
    allowLocation();
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network request failed'));

    await renderScreen();

    expect(
      await screen.findByText('Pas de connexion internet. Vérifiez votre réseau.'),
    ).toBeOnTheScreen();
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

      await waitFor(() => expect(forecastCalls(fetchMock)).toHaveLength(2));
    });

    it("revenir sur l'écran dans les 10 minutes ne relance pas d'appel", async () => {
      const { fetchMock, view, client } = await loadOnce();

      await view.unmount();
      await renderScreen(client);

      expect(await screen.findByText('Paris')).toBeOnTheScreen();
      expect(forecastCalls(fetchMock)).toHaveLength(1);
    });

    it("revenir sur l'écran après 10 minutes relance un appel", async () => {
      const { fetchMock, view, client } = await loadOnce();

      await view.unmount();
      makeDataOlderThanTenMinutes(client);
      await renderScreen(client);

      await waitFor(() => expect(forecastCalls(fetchMock)).toHaveLength(2));
    });

    it("revenir sur l'onglet après 10 minutes relance un appel", async () => {
      const { fetchMock, view, client } = await loadOnce();
      const focused = jest.mocked(useIsFocused);

      focused.mockReturnValue(false);
      await view.rerender(screenTree(client));
      makeDataOlderThanTenMinutes(client);
      focused.mockReturnValue(true);
      await view.rerender(screenTree(client));

      await waitFor(() => expect(forecastCalls(fetchMock)).toHaveLength(2));
    });

    it("rouvrir l'app relance un appel seulement après 10 minutes", async () => {
      const { fetchMock, client } = await loadOnce();
      // Passe par le vrai branchement AppState → focusManager du layout.
      const addListener = jest.spyOn(AppState, 'addEventListener');
      jest.requireActual('../src/app/_layout');
      const onAppStateChange = addListener.mock.calls[0][1];
      const reopenApp = () =>
        act(async () => {
          onAppStateChange('background');
          onAppStateChange('active');
        });

      await reopenApp();
      expect(forecastCalls(fetchMock)).toHaveLength(1);

      makeDataOlderThanTenMinutes(client);
      await reopenApp();
      await waitFor(() => expect(forecastCalls(fetchMock)).toHaveLength(2));
    });
  });

  describe("passer d'une ville à l'autre", () => {
    // Paris sous la pluie (fixture), Lyon de nuit par ciel dégagé, Nice comme Paris.
    async function renderWithFavorites() {
      Storage.setItemSync('favoris', JSON.stringify([LYON, NICE]));
      allowLocation();
      jest.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const lyon = String(url).includes(`latitude=${LYON.latitude}`);
        const current = { ...forecastFixture.current, weather_code: 0, is_day: 0 };
        const json = lyon ? { ...forecastFixture, current } : forecastFixture;
        return respond(json);
      });
      await renderScreen();
      await screen.findByText('Paris');
      await screen.findAllByText('18°');
    }

    afterEach(() => {
      mockParams = {};
    });

    it('les pages suivent ma position puis les favoris, dans leur ordre', async () => {
      await renderWithFavorites();

      const places = screen.getAllByText(/^(Paris|Lyon|Nice)$/);
      expect(places.map((place) => place.props.children)).toEqual(['Paris', 'Lyon', 'Nice']);
      expect(screen.getByTestId('indicateur')).toHaveAccessibleName('Page 1 sur 3');
    });

    it('seule la page de ma position le précise, même si un favori est la même ville', async () => {
      Storage.setItemSync(
        'favoris',
        JSON.stringify([{ id: 2988507, name: 'Paris', region: null, country: 'France' }]),
      );
      allowLocation();
      mockApi();

      await renderScreen();

      expect(await screen.findAllByText('Paris')).toHaveLength(2);
      expect(screen.getAllByTestId('mention-position')).toHaveLength(1);
      const [positionPage] = screen.getAllByTestId('fond-meteo');
      expect(within(positionPage).getByText('Ma position')).toBeOnTheScreen();
    });

    it('balayer affiche la ville suivante : indicateur et barre d’onglets suivent', async () => {
      await renderWithFavorites();
      const { width } = Dimensions.get('window');

      await fireEvent(screen.getByTestId('pages-meteo'), 'momentumScrollEnd', {
        nativeEvent: { contentOffset: { x: width, y: 0 } },
      });

      expect(screen.getByTestId('indicateur')).toHaveAccessibleName('Page 2 sur 3');
      await waitFor(() => expect(tabBarTheme.read()).toBe('nuit'));
    });

    it('supprimer le favori affiché recule sur la dernière page au lieu d’une page blanche', async () => {
      await renderWithFavorites();
      const { width } = Dimensions.get('window');
      const scrollToIndex = jest.spyOn(FlatList.prototype, 'scrollToIndex');
      await fireEvent(screen.getByTestId('pages-meteo'), 'momentumScrollEnd', {
        nativeEvent: { contentOffset: { x: 2 * width, y: 0 } },
      });
      expect(screen.getByTestId('indicateur')).toHaveAccessibleName('Page 3 sur 3');

      // Suppression de Nice depuis l'onglet Villes, resté monté à côté.
      await act(async () => toggleFavorite(NICE));

      expect(screen.getByTestId('indicateur')).toHaveAccessibleName('Page 2 sur 2');
      expect(scrollToIndex).toHaveBeenLastCalledWith({ index: 1, animated: false });
    });

    it('toutes les pages gardent le même défilement vertical', async () => {
      await renderWithFavorites();
      const scrollTo = jest.mocked(ScrollView.prototype.scrollTo);
      scrollTo.mockClear();

      // Défilement de la page affichée (ma position), puis début d'un balayage.
      await fireEvent.scroll(screen.getAllByText('Paris')[0], {
        nativeEvent: { contentOffset: { x: 0, y: 300 } },
      });
      await fireEvent(screen.getByTestId('pages-meteo'), 'scrollBeginDrag');

      const aligned = scrollTo.mock.calls.filter(([to]) => (to as { y: number }).y === 300);
      expect(aligned).toHaveLength(3);
      expect(aligned[0][0]).toEqual({ y: 300, animated: false });
    });

    it("s'ouvre sur la page demandée depuis l'onglet Villes", async () => {
      mockParams = { page: '2' };

      await renderWithFavorites();

      expect(screen.getByTestId('indicateur')).toHaveAccessibleName('Page 3 sur 3');
      expect(router.setParams).toHaveBeenCalledWith({ page: undefined });
    });

    it("toucher un jour d'une ville ouvre le détail de cette ville", async () => {
      const user = userEvent.setup();
      await renderWithFavorites();

      await user.press(screen.getAllByTestId('jour-1')[1]);

      expect(router.push).toHaveBeenCalledWith('/jour/2026-10-06?ville=2996944');
    });

    it("sans favori, pas d'indicateur", async () => {
      allowLocation();
      mockApi();

      await renderScreen();
      await screen.findByText('Paris');

      expect(screen.queryByTestId('indicateur')).not.toBeOnTheScreen();
    });
  });
});
