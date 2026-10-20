import airQualityFixture from '../../__fixtures__/open-meteo-air-quality.json';
import forecastFixture from '../../__fixtures__/open-meteo-forecast.json';
import { mockFetch, respond } from '../../jest/helpers';
import { axisTicks, chartPoints } from '../TemperatureChart';
import {
  airQualityLevel,
  ApiError,
  ApiErrorKind,
  describeWeather,
  fetchForecast,
  shouldRetry,
  temperatureBar,
} from '../weather';

describe('fetchForecast', () => {
  it('appelle Open-Meteo avec la position et convertit la réponse', async () => {
    const fetchMock = mockFetch();

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
      airQuality: {
        index: 36,
        pollutants: [
          { key: 'pm2_5', value: 6.8, index: 24 },
          { key: 'pm10', value: 8.7, index: 12 },
          { key: 'nitrogen_dioxide', value: 22.3, index: 36 },
          { key: 'ozone', value: 32, index: 11 },
          { key: 'sulphur_dioxide', value: 1.1, index: 1 },
        ],
      },
    });
    expect(forecast.hourly).toHaveLength(7 * 24);
    expect(forecast.hourly[0].time).toBe('2026-10-05T00:00');
    expect(forecast.hourly[14]).toEqual({
      time: '2026-10-05T14:00',
      weatherCode: 61,
      temperature: 15.9,
      rainChance: 80,
      isDay: true,
      airQuality: 36,
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
    mockFetch(respond(data));

    const forecast = await fetchForecast(48.85, 2.35);

    expect(forecast.hourly[0].rainChance).toBe(0);
    expect(forecast.daily[0].precipitation).toBe(0);
  });
});

describe("qualité de l'air", () => {
  // Réponse de l'air modifiée ; les prévisions restent celles du fixture.
  const mockAir = (air: unknown) =>
    jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (url) =>
        String(url).includes('air-quality') ? (air as Response) : respond(forecastFixture),
      );

  it('appelle Open-Meteo Air Quality avec la position, sur les jours des prévisions', async () => {
    const fetchMock = mockFetch();

    await fetchForecast(48.85, 2.35);

    const url = new URL(String(fetchMock.mock.calls[1][0]));
    expect(url.origin + url.pathname).toBe('https://air-quality-api.open-meteo.com/v1/air-quality');
    expect(url.searchParams.get('latitude')).toBe('48.85');
    expect(url.searchParams.get('longitude')).toBe('2.35');
    expect(url.searchParams.get('current')).toBe(
      'european_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,european_aqi_pm2_5,european_aqi_pm10,european_aqi_nitrogen_dioxide,european_aqi_ozone,european_aqi_sulphur_dioxide',
    );
    expect(url.searchParams.get('hourly')).toBe('european_aqi');
    expect(url.searchParams.get('timezone')).toBe('auto');
    expect(url.searchParams.get('forecast_days')).toBe('7');
  });

  it("associe l'indice à chaque heure, null au-delà de l'horizon", async () => {
    mockFetch();

    const { hourly } = await fetchForecast(48.85, 2.35);

    expect(hourly.find((h) => h.time === '2026-10-05T15:00')?.airQuality).toBe(41);
    expect(hourly.find((h) => h.time === '2026-10-05T16:00')?.airQuality).toBeNull();
    expect(hourly.filter((h) => h.time.startsWith('2026-10-11')).map((h) => h.airQuality)).toEqual(
      Array(24).fill(null),
    );
  });

  it('associe par heure, même si les deux services ne commencent pas pareil', async () => {
    const data = JSON.parse(JSON.stringify(airQualityFixture));
    data.hourly.time.shift();
    data.hourly.european_aqi.shift();
    mockAir(respond(data));

    const { hourly } = await fetchForecast(48.85, 2.35);

    expect(hourly[0].airQuality).toBeNull();
    expect(hourly[15].airQuality).toBe(41);
  });

  it('ignore un polluant sans valeur, et la carte sans indice global', async () => {
    const data = JSON.parse(JSON.stringify(airQualityFixture));
    data.current.ozone = null;
    mockAir(respond(data));

    const { current } = await fetchForecast(48.85, 2.35);
    expect(current.airQuality?.pollutants.map((p) => p.key)).toEqual([
      'pm2_5',
      'pm10',
      'nitrogen_dioxide',
      'sulphur_dioxide',
    ]);

    data.current.european_aqi = null;
    mockAir(respond(data));
    expect((await fetchForecast(48.85, 2.35)).current.airQuality).toBeNull();
  });

  it("garde la météo quand le service de l'air est en panne", async () => {
    mockAir({ ok: false, status: 500 });

    const forecast = await fetchForecast(48.85, 2.35);

    expect(forecast.current.temperature).toBe(18.4);
    expect(forecast.current.airQuality).toBeNull();
    expect(forecast.hourly.every((h) => h.airQuality === null)).toBe(true);
  });

  it('palier européen : bon ≤ 20, correct ≤ 40, …, extrêmement mauvais > 100', () => {
    expect([0, 20, 20.1, 40, 60, 80, 100, 101].map(airQualityLevel)).toEqual([
      0, 0, 1, 1, 2, 3, 4, 5,
    ]);
  });
});

describe("erreurs de l'API", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  const failsWith = async (kind: ApiErrorKind, message: string, status?: number) => {
    const error = await fetchForecast(48.85, 2.35).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ kind, message, status });
  };

  it('sans réseau', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network request failed'));
    await failsWith('reseau', 'erreurs.reseau');
  });

  it("quand l'API répond en erreur", async () => {
    mockFetch({ ok: false, status: 503 });
    await failsWith('http', 'erreurs.http', 503);
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
    const result = failsWith('delai', 'erreurs.delai');
    jest.advanceTimersByTime(10_000);
    await result;
  });

  it.each([
    ['incomplètes', async () => ({ current: {} })],
    ['qui ne sont pas du JSON', async () => Promise.reject(new SyntaxError('JSON Parse error'))],
  ])('quand les données sont %s', async (_, json) => {
    mockFetch({ ok: true, json });
    await failsWith('donnees', 'erreurs.donnees');
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

describe('temperatureBar', () => {
  it("place la barre du jour sur l'échelle de la semaine", () => {
    expect(temperatureBar(10, 20, 0, 40)).toEqual({ left: 25, width: 25 });
    expect(temperatureBar(-2, 4, -2, 4)).toEqual({ left: 0, width: 100 });
    // Semaine à température constante : pas de division par zéro.
    expect(temperatureBar(5, 5, 5, 5)).toEqual({ left: 0, width: 0 });
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
