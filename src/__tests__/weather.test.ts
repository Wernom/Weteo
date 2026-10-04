import forecastFixture from '../../__fixtures__/open-meteo-forecast.json';
import { axisTicks, chartPoints } from '../TemperatureChart';
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
    expect(url.searchParams.get('hourly')).toBe(
      'temperature_2m,weather_code,precipitation_probability,is_day',
    );
    expect(url.searchParams.get('daily')).toBe(
      'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,precipitation_probability_max',
    );
    // Les heures couvrent les 7 jours entiers, pas seulement les 48 prochaines.
    expect(url.searchParams.has('forecast_hours')).toBe(false);
    expect(forecast.current).toEqual({
      time: '2026-10-05T14:15',
      temperature: 18.4,
      apparentTemperature: 16.6,
      humidity: 72,
      windSpeed: 14.2,
      weatherCode: 61,
      isDay: true,
    });
    expect(forecast.hourly).toHaveLength(7 * 24);
    expect(forecast.hourly[0].time).toBe('2026-10-05T00:00');
    expect(forecast.hourly[14]).toEqual({
      time: '2026-10-05T14:00',
      weatherCode: 61,
      temperature: 15.9,
      rainChance: 80,
      isDay: true,
    });
    expect(forecast.hourly[24]).toMatchObject({ time: '2026-10-06T00:00', isDay: false });
    expect(forecast.hourly[167].time).toBe('2026-10-11T23:00');
    expect(forecast.daily).toHaveLength(7);
    expect(forecast.daily[6]).toEqual({
      date: '2026-10-11',
      weatherCode: 71,
      min: -1.6,
      max: 4.4,
      sunrise: '2026-10-11T08:10',
      sunset: '2026-10-11T19:09',
      precipitation: 3.8,
      rainChance: 60,
    });
  });

  it("lève une erreur quand l'API répond en erreur", async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 503 } as Response);

    await expect(fetchForecast(48.85, 2.35)).rejects.toThrow('Open-Meteo a répondu 503');
  });
});

describe('describeWeather', () => {
  it.each([
    [0, true, 'Ciel dégagé', 'sunny', 'jour'],
    [0, false, 'Ciel dégagé', 'moon', 'nuit'],
    [2, true, 'Peu nuageux', 'partly-sunny', 'jour'],
    [2, false, 'Peu nuageux', 'cloudy-night', 'nuit'],
    [3, true, 'Couvert', 'cloudy', 'jour'],
    [3, false, 'Couvert', 'cloudy', 'nuit'],
    [45, true, 'Brouillard', 'cloud-outline', 'jour'],
    [53, true, 'Bruine', 'rainy-outline', 'pluie'],
    [63, false, 'Pluie', 'rainy', 'pluie'],
    [73, true, 'Neige', 'snow', 'neige'],
    [77, false, 'Neige', 'snow', 'neige'],
    [81, true, 'Averses', 'rainy', 'pluie'],
    [85, true, 'Averses de neige', 'snow', 'neige'],
    [95, true, 'Orage', 'thunderstorm', 'orage'],
    [99, false, 'Orage', 'thunderstorm', 'orage'],
  ])('code %i (jour : %s) → %s', (code, isDay, label, icon, theme) => {
    expect(describeWeather(code, isDay)).toEqual({ label, icon, theme });
  });
});

describe('axisTicks', () => {
  it.each([
    [8, 16, [8, 10, 12, 14, 16]],
    [-1.6, 4.4, [-2, 0, 2, 4, 6]],
    [9.8, 12.3, [9, 10, 11, 12, 13]],
    [2, 27, [0, 10, 20, 30]],
    [12, 12, [12, 13]],
  ])('de %f à %f → %j', (min, max, ticks) => {
    expect(axisTicks(min, max)).toEqual(ticks);
  });
});

describe('chartPoints', () => {
  it("place les températures entre le bas (lo) et le haut (hi) de l'axe, régulièrement espacées", () => {
    expect(chartPoints([10, 20, 15], 100, 40, 10, 20)).toBe('0,40 50,0 100,20');
    expect(chartPoints([12, 14], 100, 40, 10, 20)).toBe('0,32 100,24');
  });
});
