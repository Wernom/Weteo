import { userEvent } from '@testing-library/react-native';
import Storage from 'expo-sqlite/kv-store';
import { renderRouter, screen } from 'expo-router/testing-library';

import forecastFixture from '../__fixtures__/open-meteo-forecast.json';
import de from '../src/locales/de.json';
import en from '../src/locales/en.json';
import es from '../src/locales/es.json';
import fr from '../src/locales/fr.json';
import italian from '../src/locales/it.json';
import i18n from '../src/i18n';
import type { City } from '../src/weather';

// Seuls les réglages et la liste des villes comptent ici.
jest.mock('../src/app/(tabs)/index', () => {
  const { Text } = jest.requireActual('react-native');
  return { __esModule: true, default: () => <Text>Écran Météo</Text> };
});

const LONDRES: City = {
  id: 2643743,
  name: 'Londres',
  region: 'Angleterre',
  country: 'Royaume-Uni',
  latitude: 51.50853,
  longitude: -0.12574,
};

afterEach(async () => {
  jest.restoreAllMocks();
  Storage.clearSync();
  await i18n.changeLanguage('fr');
});

async function openSettings() {
  const user = userEvent.setup();
  await renderRouter('./src/app');
  await user.press(await screen.findByTestId('onglet-reglages'));
  return user;
}

describe('Choisir ma langue', () => {
  it("passe immédiatement l'app dans la langue choisie et la retient", async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: true, json: async () => ({}) } as Response);
    const user = await openSettings();
    expect(screen.getByTestId('langue-fr')).toBeChecked();

    await user.press(screen.getByTestId('langue-en'));

    expect(await screen.findByText('Language')).toBeOnTheScreen();
    expect(screen.getByText('Weather')).toBeOnTheScreen();
    expect(screen.getByTestId('langue-en')).toBeChecked();
    expect(screen.getByTestId('langue-fr')).not.toBeChecked();
    expect(JSON.parse(Storage.getItemSync('reglages')!)).toMatchObject({ language: 'en' });
  });

  it('retraduit les noms des favoris', async () => {
    Storage.setItemSync('favoris', JSON.stringify([LONDRES]));
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const json = String(url).includes('/v1/get')
        ? {
            id: LONDRES.id,
            name: 'London',
            admin1: 'England',
            country: 'United Kingdom',
            latitude: 51.50853,
            longitude: -0.12574,
          }
        : forecastFixture;
      return { ok: true, json: async () => json } as Response;
    });
    const user = await openSettings();

    await user.press(screen.getByTestId('langue-en'));
    await user.press(screen.getByTestId('onglet-villes'));

    expect(await screen.findByText('London')).toBeOnTheScreen();
    expect(screen.getByText('England, United Kingdom')).toBeOnTheScreen();
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toContainEqual(
      expect.stringMatching(/\/v1\/get\?id=2643743&language=en/),
    );
  });

  it.each([
    ['de', 'de'],
    ['ja', 'fr'],
  ])('au premier lancement, téléphone en %s → app en %s', (phone, expected) => {
    // Modules neufs : la langue est lue au chargement d'i18n, comme au lancement de l'app.
    jest.isolateModules(() => {
      require('expo-localization').getLocales.mockReturnValueOnce([{ languageCode: phone }]);
      expect(require('../src/i18n').default.language).toBe(expected);
    });
  });
});

describe('Choisir mes unités', () => {
  it('coche °C, km/h et mm par défaut et retient le choix', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: true, json: async () => ({}) } as Response);
    const user = await openSettings();
    expect(screen.getByTestId('unite-celsius')).toBeChecked();
    expect(screen.getByTestId('unite-kmh')).toBeChecked();
    expect(screen.getByTestId('unite-mm')).toBeChecked();

    await user.press(screen.getByTestId('unite-fahrenheit'));
    await user.press(screen.getByTestId('unite-kn'));
    await user.press(screen.getByTestId('unite-inch'));

    expect(screen.getByTestId('unite-fahrenheit')).toBeChecked();
    expect(screen.getByTestId('unite-celsius')).not.toBeChecked();
    expect(screen.getByTestId('unite-kn')).toBeChecked();
    expect(screen.getByTestId('unite-inch')).toBeChecked();
    expect(JSON.parse(Storage.getItemSync('reglages')!)).toMatchObject({
      temperature: 'fahrenheit',
      wind: 'kn',
      precipitation: 'inch',
    });
  });
});

// Une clé oubliée dans une langue s'afficherait en français (langue de repli).
const keys = (o: object, prefix = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );

it.each([
  ['en', en],
  ['de', de],
  ['it', italian],
  ['es', es],
])('%s a toutes les clés du français', (_, locale) => {
  expect(keys(locale).sort()).toEqual(keys(fr).sort());
});
