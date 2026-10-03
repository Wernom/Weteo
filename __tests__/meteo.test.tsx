import { render, screen, userEvent } from '@testing-library/react-native';
import * as Location from 'expo-location';

import WeatherScreen from '../src/app/index';
import forecastFixture from '../__fixtures__/open-meteo-forecast.json';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
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

const okForecast = { ok: true, json: async () => forecastFixture };

function mockApi(response: Partial<Response> = okForecast) {
  return jest.spyOn(globalThis, 'fetch').mockResolvedValue(response as Response);
}

describe('Écran Météo', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('affiche la météo de ma position', async () => {
    allowLocation();
    mockApi();

    await render(<WeatherScreen />);

    expect(await screen.findByText('Paris')).toBeOnTheScreen();
    expect(screen.getByText('18°')).toBeOnTheScreen();
    expect(screen.getByText('Pluie')).toBeOnTheScreen();
    expect(screen.getByText(/Ressenti 17° · Humidité 72% · Vent 14 km\/h/)).toBeOnTheScreen();
    expect(screen.getByText('Prévisions sur 7 jours')).toBeOnTheScreen();
    expect(screen.getByText("Aujourd'hui")).toBeOnTheScreen();
    expect(screen.getByText('-2° / 4°')).toBeOnTheScreen();
  });

  it("affiche « Ma position » quand la ville n'est pas trouvée", async () => {
    allowLocation();
    location.reverseGeocodeAsync.mockRejectedValue(new Error('géocodage indisponible'));
    mockApi();

    await render(<WeatherScreen />);

    expect(await screen.findByText('Ma position')).toBeOnTheScreen();
  });

  it('explique quoi faire quand la localisation est refusée', async () => {
    location.requestForegroundPermissionsAsync.mockResolvedValue({
      granted: false,
    } as Location.LocationPermissionResponse);
    const fetchMock = mockApi();

    await render(<WeatherScreen />);

    expect(
      await screen.findByText('Autorise la localisation pour voir la météo autour de toi.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Réessayer')).toBeOnTheScreen();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("propose de réessayer quand l'API est en erreur, puis affiche la météo", async () => {
    allowLocation();
    const fetchMock = mockApi({ ok: false, status: 500 });
    const user = userEvent.setup();

    await render(<WeatherScreen />);

    expect(await screen.findByText('Open-Meteo a répondu 500')).toBeOnTheScreen();

    fetchMock.mockResolvedValue(okForecast as Response);
    await user.press(screen.getByText('Réessayer'));

    expect(await screen.findByText('Paris')).toBeOnTheScreen();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('affiche une erreur quand il n’y a pas de réseau', async () => {
    allowLocation();
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network request failed'));

    await render(<WeatherScreen />);

    expect(await screen.findByText('Network request failed')).toBeOnTheScreen();
    expect(screen.getByText('Réessayer')).toBeOnTheScreen();
  });
});
