import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, userEvent, within } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';

import CitiesScreen from '../src/app/(tabs)/villes';
import { City, fetchForecast, WEATHER_QUERY_KEY } from '../src/weather';
import forecastFixture from '../__fixtures__/open-meteo-forecast.json';
import geocodingFixture from '../__fixtures__/open-meteo-geocoding.json';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));
jest.mock('expo-location', () => ({ requestForegroundPermissionsAsync: jest.fn() }));

const LYON: City = {
  id: 2996944,
  name: 'Lyon',
  region: 'Rhône-Alpes',
  country: 'France',
  latitude: 45.74906,
  longitude: 4.84789,
};
const NICE: City = {
  id: 2990440,
  name: 'Nice',
  region: "Provence-Alpes-Côte d'Azur",
  country: 'France',
  latitude: 43.70313,
  longitude: 7.26608,
};

function mockApi(response: Partial<Response>) {
  return jest.spyOn(globalThis, 'fetch').mockResolvedValue(response as Response);
}

// Recherche → fixture geocoding, prévisions → fixture forecast.
function mockBothApis() {
  return jest.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    const json = String(url).includes('geocoding') ? geocodingFixture : forecastFixture;
    return { ok: true, json: async () => json } as Response;
  });
}

const storedFavorites = (): City[] => JSON.parse(Storage.getItemSync('favoris') ?? '[]');

function newClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
}

async function renderScreen(client = newClient()) {
  await render(
    <QueryClientProvider client={client}>
      <CitiesScreen />
    </QueryClientProvider>,
  );
}

// Laisse passer la pause de 300 ms après la frappe.
const debounce = () => act(() => new Promise((resolve) => setTimeout(resolve, 300)));

async function search(text: string) {
  const user = userEvent.setup();
  await renderScreen();
  await user.type(screen.getByLabelText('Nom de la ville'), text);
  await debounce();
  return user;
}

afterEach(() => {
  jest.restoreAllMocks();
  Storage.clearSync();
});

describe('Écran Villes', () => {
  it('affiche les villes trouvées avec leur région et leur pays', async () => {
    const fetchMock = mockApi({ ok: true, json: async () => geocodingFixture });

    await search('Lyon');

    expect(await screen.findByText('Rhône-Alpes, France')).toBeOnTheScreen();
    expect(screen.getByText('Mississippi, États-Unis')).toBeOnTheScreen();
    expect(screen.getByTestId('ville-2')).toHaveAccessibleName('Lyon, Missouri, États-Unis');
    // Une seule requête, une fois la frappe terminée.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/[?&]name=Lyon&.*language=fr/);
  });

  it("dit clairement qu'aucune ville n'est trouvée", async () => {
    mockApi({ ok: true, json: async () => ({ generationtime_ms: 0.2 }) });

    await search('zzqxwv');

    expect(
      await screen.findByText("Aucune ville trouvée pour « zzqxwv ». Vérifiez l'orthographe."),
    ).toBeOnTheScreen();
  });

  it("n'interroge pas l'API pour une seule lettre", async () => {
    const fetchMock = mockApi({ ok: true, json: async () => geocodingFixture });

    await search('L');

    expect(screen.getByText('Tapez au moins 2 lettres.')).toBeOnTheScreen();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("propose de réessayer quand l'API est en erreur, puis affiche les villes", async () => {
    const fetchMock = mockApi({ ok: false, status: 503 });

    const user = await search('Lyon');
    expect(await screen.findByText('Open-Meteo a répondu 503')).toBeOnTheScreen();

    fetchMock.mockResolvedValue({ ok: true, json: async () => geocodingFixture } as Response);
    await user.press(screen.getByText('Réessayer'));

    expect(await screen.findByText('Rhône-Alpes, France')).toBeOnTheScreen();
  });

  it('toucher une ville ouvre sa météo', async () => {
    mockApi({ ok: true, json: async () => geocodingFixture });

    const user = await search('Lyon');
    await user.press(await screen.findByTestId('ville-0'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/ville/[id]',
      params: {
        id: '2996944',
        name: 'Lyon',
        region: 'Rhône-Alpes',
        country: 'France',
        latitude: '45.74906',
        longitude: '4.84789',
      },
    });
  });
});

describe('Villes favorites', () => {
  it("l'étoile d'un résultat ajoute la ville, listée sous « Ma position » sans recherche", async () => {
    mockBothApis();

    const user = await search('Lyon');
    await user.press(await screen.findByTestId('etoile-0'));

    expect(screen.getByTestId('etoile-0')).toHaveAccessibleName('Retirer Lyon des favoris');
    expect(storedFavorites()).toEqual([LYON]);

    await user.clear(screen.getByLabelText('Nom de la ville'));
    await debounce();

    expect(screen.getByTestId('ma-position')).toBeOnTheScreen();
    expect(screen.getByTestId('favori-0')).toHaveAccessibleName('Lyon, Rhône-Alpes, France');
    // Météo résumée de la ville (18,4 °C dans la fixture).
    expect(await within(screen.getByTestId('favori-0')).findByText('18°')).toBeOnTheScreen();
  });

  it('retrouve les favoris enregistrés au lancement, après « Ma position »', async () => {
    mockBothApis();
    Storage.setItemSync('favoris', JSON.stringify([LYON, NICE]));

    await renderScreen();

    const rows = screen.getAllByRole('button', { name: /^(Ma position|Lyon,|Nice,)/ });
    expect(rows.map((row) => row.props.testID)).toEqual(['ma-position', 'favori-0', 'favori-1']);
    expect(screen.getByTestId('favori-1')).toHaveAccessibleName(/^Nice,/);
    // Chaque favori affiche sa météo résumée.
    expect(await screen.findAllByText('18°')).toHaveLength(2);
  });

  it('les flèches réordonnent les favoris, la croix en supprime un', async () => {
    mockBothApis();
    Storage.setItemSync('favoris', JSON.stringify([LYON, NICE]));
    const user = userEvent.setup();
    await renderScreen();
    await screen.findAllByText('18°');

    expect(screen.getByLabelText('Monter Lyon')).toBeDisabled();
    expect(screen.getByLabelText('Descendre Nice')).toBeDisabled();

    await user.press(screen.getByLabelText('Descendre Lyon'));

    expect(screen.getByTestId('favori-0')).toHaveAccessibleName(/^Nice,/);
    expect(screen.getByTestId('favori-1')).toHaveAccessibleName(/^Lyon,/);
    expect(storedFavorites()).toEqual([NICE, LYON]);

    await user.press(screen.getByLabelText('Monter Lyon'));
    expect(storedFavorites()).toEqual([LYON, NICE]);

    await user.press(screen.getByLabelText('Supprimer Lyon'));

    expect(screen.queryByText('Lyon')).not.toBeOnTheScreen();
    expect(storedFavorites()).toEqual([NICE]);
  });

  it("« Ma position » reprend le lieu et la météo déjà chargés, et ouvre l'onglet Météo", async () => {
    mockBothApis();
    const client = newClient();
    client.setQueryData(WEATHER_QUERY_KEY, {
      forecast: await fetchForecast(48.85, 2.35),
      place: 'Paris',
    });
    const user = userEvent.setup();
    await renderScreen(client);

    const row = screen.getByTestId('ma-position');
    expect(row).toHaveAccessibleName('Ma position · Paris');
    expect(within(row).getByText('18°')).toBeOnTheScreen();

    await user.press(row);
    expect(router.navigate).toHaveBeenCalledWith('/');
  });

  it('sans météo chargée, « Ma position » reste seule sans demander la localisation', async () => {
    const fetchMock = mockBothApis();

    await renderScreen();

    expect(screen.getByTestId('ma-position')).toHaveAccessibleName('Ma position');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });
});
