import Storage from 'expo-sqlite/kv-store';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { LYON, mockFetch, newClient, NICE } from '../jest/helpers';
import Location from '../modules/weteo-location';
import Widget from '../modules/weteo-widget';
import { cityQueryKey, describeWeather, WEATHER_QUERY_KEY, WeatherData } from '../src/weather';
import { refreshWidget, syncWidget, widgetSnapshot } from '../src/widget';

const location = jest.mocked(Location);
const widget = jest.mocked(Widget);

const weather = (current: object, place: string | null = 'Lyon') =>
  ({ forecast: { current }, place }) as WeatherData;

// Nice en favori, choisie pour le widget.
const chooseNice = () => {
  Storage.setItemSync('favoris', JSON.stringify([NICE]));
  Storage.setItemSync('reglages', JSON.stringify({ widgetCity: NICE.id }));
};

afterEach(() => {
  jest.clearAllMocks();
});

describe('Données du widget', () => {
  it('affiche la ville, la température arrondie et l’icône du temps', () => {
    expect(
      widgetSnapshot(weather({ temperature: 18.4, weatherCode: 61, isDay: true }), 'celsius'),
    ).toEqual({ place: 'Lyon', temperature: '18°', icon: 'rainy' });
  });

  it('suit l’unité des réglages', () => {
    expect(
      widgetSnapshot(weather({ temperature: 18.4, weatherCode: 0, isDay: true }), 'fahrenheit'),
    ).toMatchObject({ temperature: '65°', icon: 'sunny' });
  });

  it('a un pictogramme Android pour chaque temps', () => {
    const drawables = join(__dirname, '../modules/weteo-widget/android/src/main/res/drawable');
    for (let code = 0; code <= 99; code++) {
      for (const isDay of [true, false]) {
        const name = describeWeather(code, isDay).icon.replace(/-/g, '_');
        expect(existsSync(join(drawables, `weteo_widget_${name}.xml`))).toBe(true);
      }
    }
  });

  it('montre la nuit, et « Ma position » sans nom de lieu', () => {
    expect(
      widgetSnapshot(weather({ temperature: 2, weatherCode: 0, isDay: false }, null), 'celsius'),
    ).toEqual({ place: 'Ma position', temperature: '2°', icon: 'moon' });
  });
});

describe('Mise à jour depuis l’app', () => {
  it('reprend la météo gardée hors ligne dès l’ouverture', () => {
    const client = newClient();
    client.setQueryData(
      WEATHER_QUERY_KEY,
      weather({ temperature: 11, weatherCode: 3, isDay: true }, 'Paris'),
    );

    syncWidget(client);

    expect(widget.update).toHaveBeenCalledWith('Paris', '11°', 'cloudy');
  });

  it('suit la météo de ma position, pas celle des villes', async () => {
    const client = newClient();
    syncWidget(client);
    const data = weather({ temperature: 18.4, weatherCode: 61, isDay: true });

    await client.fetchQuery({ queryKey: cityQueryKey('1'), queryFn: async () => data });
    expect(widget.update).not.toHaveBeenCalled();

    await client.fetchQuery({ queryKey: WEATHER_QUERY_KEY, queryFn: async () => data });
    expect(widget.update).toHaveBeenCalledWith('Lyon', '18°', 'rainy');
  });

  it('suit la ville choisie pour le widget, pas ma position', async () => {
    chooseNice();
    const client = newClient();
    syncWidget(client);
    const data = weather({ temperature: 18.4, weatherCode: 61, isDay: true }, 'Nice');

    await client.fetchQuery({ queryKey: WEATHER_QUERY_KEY, queryFn: async () => data });
    expect(widget.update).not.toHaveBeenCalled();

    await client.fetchQuery({ queryKey: cityQueryKey(String(NICE.id)), queryFn: async () => data });
    expect(widget.update).toHaveBeenCalledWith('Nice', '18°', 'rainy');
  });
});

describe('Mise à jour en tâche de fond', () => {
  it('charge la météo de la dernière position connue, dans l’unité des réglages', async () => {
    Storage.setItemSync('reglages', JSON.stringify({ temperature: 'fahrenheit' }));
    location.getLastKnownPositionAsync.mockResolvedValue({ coords: LYON });
    location.reverseGeocodeAsync.mockResolvedValue([{ city: 'Lyon' }]);
    const fetchMock = mockFetch();

    await refreshWidget();

    expect(String(fetchMock.mock.calls[0][0])).toContain(`latitude=${LYON.latitude}`);
    // Fixture : 18,4 °C et pluie (code 61).
    expect(widget.update).toHaveBeenCalledWith('Lyon', '65°', 'rainy');
  });

  it('charge la ville choisie sans demander la position', async () => {
    chooseNice();
    const fetchMock = mockFetch();

    await refreshWidget();

    expect(location.getLastKnownPositionAsync).not.toHaveBeenCalled();
    expect(String(fetchMock.mock.calls[0][0])).toContain(`latitude=${NICE.latitude}`);
    expect(widget.update).toHaveBeenCalledWith('Nice', '18°', 'rainy');
  });

  it('revient à ma position quand la ville choisie n’est plus favorite', async () => {
    Storage.setItemSync('reglages', JSON.stringify({ widgetCity: NICE.id }));
    location.getLastKnownPositionAsync.mockResolvedValue({ coords: LYON });
    location.reverseGeocodeAsync.mockResolvedValue([{ city: 'Lyon' }]);
    const fetchMock = mockFetch();

    await refreshWidget();

    expect(String(fetchMock.mock.calls[0][0])).toContain(`latitude=${LYON.latitude}`);
    expect(widget.update).toHaveBeenCalledWith('Lyon', '18°', 'rainy');
  });

  it('garde l’affichage sans position connue', async () => {
    location.getLastKnownPositionAsync.mockResolvedValue(null);
    const fetchMock = mockFetch();

    await refreshWidget();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(widget.update).not.toHaveBeenCalled();
  });

  it('ne charge rien sans widget posé', async () => {
    widget.hasWidgets.mockReturnValueOnce(false);
    const fetchMock = mockFetch();

    await refreshWidget();

    expect(location.getLastKnownPositionAsync).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
