import * as MapLibre from '@maplibre/maplibre-react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import Location from '../modules/weteo-location';
import { Linking } from 'react-native';

import RadarScreen from '../src/app/(tabs)/radar';
import { shownCity } from '../src/favorites';
import radarFixture from '../__fixtures__/librewxr-weather-maps.json';
import { LOCATION_DENIED, radarFramesQuery, WEATHER_QUERY_KEY } from '../src/weather';
import { LYON, newClient, NICE, respond } from '../jest/helpers';

let mockFocused = true;
jest.mock('expo-router', () => ({ useIsFocused: () => mockFocused }));

// Ajouté par le mock de jest/setup.ts.
const flyTo = (MapLibre as unknown as { flyTo: jest.Mock }).flyTo;
const location = jest.mocked(Location);
const coords = { latitude: 48.85, longitude: 2.35 };

const screenWith = (client: ReturnType<typeof newClient>) => (
  <QueryClientProvider client={client}>
    <RadarScreen />
  </QueryClientProvider>
);
const renderScreen = (client = newClient()) => render(screenWith(client));

const camera = () => screen.getByTestId('camera').props;
const carte = () => screen.getByTestId('radar-carte');
const visibles = () =>
  screen
    .getAllByTestId('radar-couche')
    .filter((couche) => couche.props.paint['raster-opacity'] > 0.5);

// 19 images de la fixture, une toutes les 10 min : 13 observées, de la plus ancienne à la dernière,
// puis 6 prévues.
const FRAMES = 19;
const OLDEST = 1792596000;
const LATEST = 1792603200;
const STEP = 600;
const LAST_FORECAST = LATEST + 6 * STEP;
const LATEST_INDEX = 12;
const heure = (time: number) =>
  new Intl.DateTimeFormat('fr', { hour: '2-digit', minute: '2-digit' }).format(time * 1000);

describe('Écran Radar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFocused = true;
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(respond(radarFixture));
  });

  it('centre la carte sur le favori affiché, zoom libre, avec la dernière image observée', async () => {
    shownCity.write(LYON);
    await renderScreen();

    const sources = await screen.findAllByTestId('radar-source');
    const url = `https://api.librewxr.net/v2/radar/${LATEST}/512/{z}/{x}/{y}/2/1_1.png`;
    expect(sources[LATEST_INDEX]).toHaveProp('tiles', [url]);
    expect(visibles().map((couche) => couche.props.id)).toEqual([url]);
    expect(camera().initialViewState).toEqual({ center: [LYON.longitude, LYON.latitude], zoom: 6 });
    expect(camera().maxZoom).toBeUndefined();
    expect(sources[LATEST_INDEX]).toHaveProp('maxzoom', 7);
    expect(flyTo).not.toHaveBeenCalled();
  });

  it('suit la ville affichée dans l’onglet Météo', async () => {
    shownCity.write(LYON);
    await renderScreen();
    await screen.findAllByTestId('radar-source');

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

    await screen.findAllByTestId('radar-source');
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

    await screen.findAllByTestId('radar-source');
    expect(camera().initialViewState).toEqual({ center: [2.5, 46.5], zoom: 4 });
    expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('ouvre LibreWXR depuis la mention', async () => {
    const user = userEvent.setup();
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    shownCity.write(LYON);
    await renderScreen();

    await user.press(screen.getByRole('link', { name: 'Rain data by LibreWXR (CC BY 4.0)' }));

    expect(open).toHaveBeenCalledWith('https://github.com/JoshuaKimsey/LibreWXR');
  });

  it('change l’URL des tuiles quand une prévision est recalculée ou devient une observation', async () => {
    const tilesAt = async (latestIndex: number) => {
      const { past, nowcast } = radarFixture.radar;
      const all = [...past, ...nowcast];
      jest.spyOn(globalThis, 'fetch').mockResolvedValue(
        respond({
          ...radarFixture,
          radar: { past: all.slice(0, latestIndex + 1), nowcast: all.slice(latestIndex + 1) },
        }),
      );
      const frames = await newClient().fetchQuery(radarFramesQuery);
      return frames.find((frame) => frame.time === LATEST + 2 * STEP)?.tiles;
    };
    const url = `https://api.librewxr.net/v2/radar/${LATEST + 2 * STEP}/512/{z}/{x}/{y}/2/1_1.png`;

    expect(await tilesAt(12)).toBe(`${url}?run=${LATEST}`);
    expect(await tilesAt(13)).toBe(`${url}?run=${LATEST + STEP}`);
    expect(await tilesAt(14)).toBe(url);
  });

  it('garde la carte sans radar quand LibreWXR ne répond pas', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 503 } as Response);
    shownCity.write(LYON);
    await renderScreen();

    expect(await screen.findByText('Radar indisponible pour le moment')).toBeOnTheScreen();
    expect(screen.getByTestId('radar-carte')).toBeOnTheScreen();
    expect(screen.queryByTestId('radar-source')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('radar-lecture')).not.toBeOnTheScreen();
  });

  describe('Animation', () => {
    const avance = (ms: number) => act(async () => jest.advanceTimersByTime(ms));
    const expectHeure = (time: number) =>
      expect(screen.getByTestId('radar-heure')).toHaveTextContent(heure(time));

    const ouvre = async () => {
      await renderScreen();
      await screen.findByTestId('radar-lecture');
    };
    const lance = async () => {
      await fireEvent.press(screen.getByLabelText('Lecture'));
      await fireEvent(carte(), 'didFinishRenderingFrameFully');
    };

    beforeEach(() => {
      jest.useFakeTimers();
      shownCity.write(LYON);
    });
    afterEach(() => jest.useRealTimers());

    it('charge toutes les images dès l’ouverture, sans lancer la lecture', async () => {
      await ouvre();

      expect(screen.getAllByTestId('radar-source')).toHaveLength(FRAMES);
      expectHeure(LATEST);
      expect(visibles()).toHaveLength(1);
      expect(screen.getByLabelText('Lecture')).toBeOnTheScreen();

      await avance(5000);
      expectHeure(LATEST);
    });

    it('lit tout de suite si les images ont fini de charger', async () => {
      await ouvre();
      await fireEvent(carte(), 'didFinishRenderingFrameFully');
      expect(screen.getByLabelText('Lecture')).toBeOnTheScreen();

      await fireEvent.press(screen.getByLabelText('Lecture'));

      expect(screen.getByLabelText('Pause')).toBeOnTheScreen();
    });

    it('n’attend pas la fin du fond de carte tant que les images ne sont pas là', async () => {
      await renderScreen();
      await fireEvent(carte(), 'didFinishRenderingFrameFully');
      await screen.findByTestId('radar-lecture');

      await fireEvent.press(screen.getByLabelText('Lecture'));

      expect(screen.getByLabelText('Chargement des images radar')).toBeOnTheScreen();
    });

    it('attend le chargement de toutes les images avant de défiler', async () => {
      await ouvre();

      await fireEvent.press(screen.getByLabelText('Lecture'));

      expect(screen.getAllByTestId('radar-source')).toHaveLength(FRAMES);
      expect(screen.getByLabelText('Chargement des images radar')).toBeOnTheScreen();
      await avance(5000);
      expectHeure(LATEST);

      await fireEvent(carte(), 'didFinishRenderingFrameFully');
      expect(screen.getByLabelText('Pause')).toBeOnTheScreen();
    });

    it('démarre quand même si le chargement ne finit pas', async () => {
      await ouvre();

      await fireEvent.press(screen.getByLabelText('Lecture'));
      await avance(10_000);

      expect(screen.getByLabelText('Pause')).toBeOnTheScreen();
    });

    it('annule la lecture si on touche le bouton pendant le chargement', async () => {
      await ouvre();

      await fireEvent.press(screen.getByLabelText('Lecture'));
      await fireEvent.press(screen.getByLabelText('Chargement des images radar'));
      await avance(10_000);

      expect(screen.getByLabelText('Lecture')).toBeOnTheScreen();
      expectHeure(LATEST);
    });

    it('fait défiler les images en boucle, une seule visible à la fois', async () => {
      await ouvre();
      await lance();

      await avance(450);
      expectHeure(OLDEST);
      expect(visibles()).toHaveLength(1);

      await avance(450);
      expectHeure(OLDEST + STEP);
      expect(visibles()).toHaveLength(1);

      await avance(450 * (FRAMES - 2));
      expectHeure(LAST_FORECAST);

      await avance(450);
      expectHeure(OLDEST);
    });

    it('annonce les prévisions à l’écran et au lecteur d’écran, sans changer les observées', async () => {
      await ouvre();
      const curseur = screen.getByTestId('radar-curseur');
      await fireEvent(curseur, 'layout', { nativeEvent: { layout: { width: 1800, height: 48 } } });
      expectHeure(LATEST);
      expect(screen.queryByText('Prévision')).not.toBeOnTheScreen();

      await fireEvent(curseur, 'responderGrant', { nativeEvent: { locationX: 9999 } });

      expectHeure(LAST_FORECAST);
      expect(screen.getByText('Prévision')).toBeOnTheScreen();
      expect(curseur).toHaveAccessibilityValue({ text: `Prévision ${heure(LAST_FORECAST)}` });
      expect(visibles()[0].props.id).toContain(`?run=${LATEST}`);
    });

    it('garde les images observées sans prévisions dans la réponse', async () => {
      const { past } = radarFixture.radar;
      jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(respond({ ...radarFixture, radar: { past } }));
      await ouvre();

      expectHeure(LATEST);
      await lance();
      expect(screen.getAllByTestId('radar-source')).toHaveLength(13);
    });

    it('fige l’image en pause et reprend sans recharger', async () => {
      await ouvre();
      await lance();
      await avance(450);

      await fireEvent.press(screen.getByLabelText('Pause'));
      await avance(5000);
      expectHeure(OLDEST);
      expect(screen.getAllByTestId('radar-source')).toHaveLength(FRAMES);

      await fireEvent.press(screen.getByLabelText('Lecture'));
      expect(screen.getByLabelText('Pause')).toBeOnTheScreen();
      await avance(450);
      expectHeure(OLDEST + STEP);
    });

    it('choisit l’image au curseur et met en pause', async () => {
      await ouvre();
      await lance();
      const curseur = screen.getByTestId('radar-curseur');
      // 1800 px pour 18 intervalles : 100 px par image.
      await fireEvent(curseur, 'layout', { nativeEvent: { layout: { width: 1800, height: 48 } } });

      await fireEvent(curseur, 'responderGrant', { nativeEvent: { locationX: 110 } });
      expectHeure(OLDEST + STEP);
      expect(curseur).toHaveAccessibilityValue({ text: heure(OLDEST + STEP) });
      expect(screen.getByLabelText('Lecture')).toBeOnTheScreen();

      await avance(5000);
      expectHeure(OLDEST + STEP);

      await fireEvent(curseur, 'responderMove', { nativeEvent: { locationX: 9999 } });
      expectHeure(LAST_FORECAST);

      await fireEvent(curseur, 'accessibilityAction', {
        nativeEvent: { actionName: 'decrement' },
      });
      expectHeure(LAST_FORECAST - STEP);
    });

    it('au curseur avant la fin du chargement, la lecture attend encore le chargement', async () => {
      await ouvre();
      const curseur = screen.getByTestId('radar-curseur');
      await fireEvent(curseur, 'layout', { nativeEvent: { layout: { width: 1800, height: 48 } } });

      await fireEvent(curseur, 'responderGrant', { nativeEvent: { locationX: 110 } });
      expectHeure(OLDEST + STEP);
      expect(screen.getAllByTestId('radar-source')).toHaveLength(FRAMES);

      await fireEvent.press(screen.getByLabelText('Lecture'));
      expect(screen.getByLabelText('Chargement des images radar')).toBeOnTheScreen();
    });

    it('au curseur pendant le chargement de la lecture, annule la lecture', async () => {
      await ouvre();
      const curseur = screen.getByTestId('radar-curseur');
      await fireEvent(curseur, 'layout', { nativeEvent: { layout: { width: 1800, height: 48 } } });
      await fireEvent.press(screen.getByLabelText('Lecture'));

      await fireEvent(curseur, 'responderGrant', { nativeEvent: { locationX: 110 } });
      await avance(10_000);

      expect(screen.getByLabelText('Lecture')).toBeOnTheScreen();
      expectHeure(OLDEST + STEP);
    });

    it('recharge toutes les images une fois la carte déplacée', async () => {
      await ouvre();
      await fireEvent(carte(), 'didFinishRenderingFrameFully');

      await fireEvent(carte(), 'regionWillChange');
      expect(screen.getAllByTestId('radar-source')).toHaveLength(1);

      await fireEvent(carte(), 'regionDidChange');
      expect(screen.getAllByTestId('radar-source')).toHaveLength(FRAMES);

      // Les tuiles du nouvel endroit ne sont pas encore là : la lecture attend.
      await fireEvent.press(screen.getByLabelText('Lecture'));
      expect(screen.getByLabelText('Chargement des images radar')).toBeOnTheScreen();
    });

    it('ne touche pas à la lecture quand la carte finit de bouger sans s’être arrêtée', async () => {
      await ouvre();
      await lance();

      await fireEvent(carte(), 'regionDidChange');

      expect(screen.getByLabelText('Pause')).toBeOnTheScreen();
    });

    it('garde l’image en pause quand la liste se rafraîchit', async () => {
      const client = newClient();
      await renderScreen(client);
      await screen.findByTestId('radar-lecture');
      await lance();
      await avance(900);
      await fireEvent.press(screen.getByLabelText('Pause'));
      expectHeure(OLDEST + STEP);

      await act(async () => {
        client.setQueryData(radarFramesQuery.queryKey, (frames) => frames?.slice(1));
      });
      // React Query prévient l'écran par une minuterie.
      await avance(0);

      expect(screen.getAllByTestId('radar-source')).toHaveLength(FRAMES - 1);
      expectHeure(OLDEST + STEP);
    });

    it('revient à la dernière image observée quand l’image choisie quitte la liste', async () => {
      const client = newClient();
      await renderScreen(client);
      await screen.findByTestId('radar-lecture');
      await lance();
      await avance(450);
      await fireEvent.press(screen.getByLabelText('Pause'));
      expectHeure(OLDEST);

      await act(async () => {
        client.setQueryData(radarFramesQuery.queryKey, (frames) => frames?.slice(1));
      });
      await avance(0);

      expectHeure(LATEST);
      expect(visibles()).toHaveLength(1);
    });

    it('précharge les images cachées avec une opacité non nulle', async () => {
      await ouvre();
      await lance();

      for (const couche of screen.getAllByTestId('radar-couche')) {
        expect(couche.props.paint['raster-opacity']).toBeGreaterThan(0);
      }
    });

    it('arrête la lecture et ne garde que l’image affichée quand la carte bouge', async () => {
      await ouvre();
      await lance();
      await avance(450);

      await fireEvent(carte(), 'regionWillChange');

      expect(screen.getAllByTestId('radar-source')).toHaveLength(1);
      expect(screen.getByLabelText('Lecture')).toBeOnTheScreen();
      await avance(5000);
      expectHeure(OLDEST);
      expect(visibles()).toHaveLength(1);
    });

    it('s’arrête hors de l’onglet et reprend au retour', async () => {
      const client = newClient();
      await renderScreen(client);
      await screen.findByTestId('radar-lecture');
      await lance();
      await avance(450);

      mockFocused = false;
      await screen.rerender(screenWith(client));
      await avance(5000);
      expectHeure(OLDEST);

      mockFocused = true;
      await screen.rerender(screenWith(client));
      await avance(450);
      expectHeure(OLDEST + STEP);
    });
  });
});
