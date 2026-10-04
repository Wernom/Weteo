import forecastFixture from '../../__fixtures__/open-meteo-forecast.json';
import { axisTicks, chartPoints } from '../TemperatureChart';
import { ApiError, ApiErrorKind, describeWeather, fetchForecast, shouldRetry } from '../weather';

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

  it('remplace les précipitations manquantes (null) par 0', async () => {
    const data = JSON.parse(JSON.stringify(forecastFixture));
    data.hourly.precipitation_probability[0] = null;
    data.daily.precipitation_sum[0] = null;
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: true, json: async () => data } as Response);

    const forecast = await fetchForecast(48.85, 2.35);

    expect(forecast.hourly[0].rainChance).toBe(0);
    expect(forecast.daily[0].precipitation).toBe(0);
  });
});

describe("erreurs de l'API", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  const failsWith = async (kind: ApiErrorKind, message: string, status?: number) => {
    const error = await fetchForecast(48.85, 2.35).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ kind, message, status });
  };

  it('sans réseau', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network request failed'));
    await failsWith('reseau', 'Pas de connexion internet. Vérifiez votre réseau.');
  });

  it("quand l'API répond en erreur", async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 503 } as Response);
    await failsWith('http', 'Le service météo est indisponible pour le moment.', 503);
  });

  it('quand la réponse dépasse 10 s', async () => {
    jest.useFakeTimers();
    // Comme le vrai fetch : ne répond jamais, rejette quand on l'annule.
    jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(
        (_, init) =>
          new Promise((_, reject) =>
            init!.signal!.addEventListener('abort', () => reject(new Error('Aborted'))),
          ),
      );
    const result = failsWith('delai', 'Le service météo met trop de temps à répondre.');
    jest.advanceTimersByTime(10_000);
    await result;
  });

  it.each([
    ['incomplètes', async () => ({ current: {} })],
    ['qui ne sont pas du JSON', async () => Promise.reject(new SyntaxError('JSON Parse error'))],
  ])('quand les données sont %s', async (_, json) => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json } as unknown as Response);
    await failsWith('donnees', 'Les données météo reçues sont invalides.');
  });
});

describe('shouldRetry', () => {
  it.each([
    ['réseau', new ApiError('reseau'), 0, true],
    ['délai', new ApiError('delai'), 1, true],
    ['HTTP 503', new ApiError('http', 503), 0, true],
    ['réseau, déjà relancée deux fois', new ApiError('reseau'), 2, false],
    ['HTTP 404', new ApiError('http', 404), 0, false],
    ['données invalides', new ApiError('donnees'), 0, false],
    ['localisation refusée', new Error('Autorisez la localisation'), 0, false],
  ])('%s → %s', (_, error, failureCount, expected) => {
    expect(shouldRetry(failureCount, error)).toBe(expected);
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
