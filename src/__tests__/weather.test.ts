import forecastFixture from '../../__fixtures__/open-meteo-forecast.json';
import { describeWeather, fetchForecast } from '../weather';

describe('fetchForecast', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('appelle Open-Meteo avec la position et convertit la réponse', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: true, json: async () => forecastFixture } as Response);

    const forecast = await fetchForecast(48.85, 2.35);

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast');
    expect(url.searchParams.get('latitude')).toBe('48.85');
    expect(url.searchParams.get('longitude')).toBe('2.35');
    expect(forecast.current).toEqual({
      temperature: 18.4,
      apparentTemperature: 16.6,
      humidity: 72,
      windSpeed: 14.2,
      weatherCode: 61,
      isDay: true,
    });
    expect(forecast.daily).toHaveLength(7);
    expect(forecast.daily[6]).toEqual({ date: '2026-10-11', weatherCode: 71, min: -1.6, max: 4.4 });
  });

  it("lève une erreur quand l'API répond en erreur", async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 503 } as Response);

    await expect(fetchForecast(48.85, 2.35)).rejects.toThrow('Open-Meteo a répondu 503');
  });
});

describe('describeWeather', () => {
  it.each([
    [0, true, 'Ciel dégagé', '☀️'],
    [0, false, 'Ciel dégagé', '🌙'],
    [2, true, 'Peu nuageux', '🌤️'],
    [3, true, 'Couvert', '☁️'],
    [45, true, 'Brouillard', '🌫️'],
    [53, true, 'Bruine', '🌦️'],
    [63, true, 'Pluie', '🌧️'],
    [73, true, 'Neige', '🌨️'],
    [81, true, 'Averses', '🌦️'],
    [85, true, 'Averses de neige', '🌨️'],
    [95, true, 'Orage', '⛈️'],
  ])('code %i (jour : %s) → %s', (code, isDay, label, icon) => {
    expect(describeWeather(code, isDay)).toEqual({ label, icon });
  });
});
