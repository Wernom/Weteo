import type Ionicons from '@expo/vector-icons/Ionicons';
import { queryOptions } from '@tanstack/react-query';
import type { ComponentProps } from 'react';
import { z } from 'zod';

import Location from '../modules/weteo-location';

import i18n from './i18n';
import type { Language } from './settings';

export type IconName = ComponentProps<typeof Ionicons>['name'];

// Client Open-Meteo (gratuit, sans clé API) : https://open-meteo.com/en/docs

// `time` est l'heure locale du lieu (« 2026-10-05T14:15 »), pas celle du téléphone.
type CurrentWeather = {
  time: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  isDay: boolean;
  airQuality: AirQuality | null;
  uvIndex: number | null;
};

// Polluants de l'indice européen, dans l'ordre d'affichage (noms de l'API Open-Meteo).
export const POLLUTANTS = [
  'pm2_5',
  'pm10',
  'nitrogen_dioxide',
  'ozone',
  'sulphur_dioxide',
] as const;
export type Pollutant = (typeof POLLUTANTS)[number];

// Indice européen (EAQI) : le pire des sous-indices de ses polluants. `value` est en µg/m³.
export type AirQuality = {
  index: number;
  pollutants: { key: Pollutant; value: number; index: number }[];
};

// `sunrise` et `sunset` sont en heure locale du lieu (« 2026-10-05T07:58 »).
export type DailyForecast = {
  date: string;
  weatherCode: number;
  min: number;
  max: number;
  sunrise: string;
  sunset: string;
  precipitation: number;
  rainChance: number;
  uvMax: number | null;
};

// `time` est l'heure locale du lieu (« 2026-10-05T14:00 »), pas celle du téléphone.
export type HourlyForecast = {
  time: string;
  weatherCode: number;
  temperature: number;
  rainChance: number;
  isDay: boolean;
  // Indice européen ; `null` au-delà de l'horizon des prévisions de l'air (4 à 5 jours).
  airQuality: number | null;
  uvIndex: number | null;
};

// `hourly` couvre les 7 jours de `daily`, de 00:00 à 23:00.
type Forecast = {
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
};

export type WeatherData = { forecast: Forecast; place: string | null };

export const WEATHER_QUERY_KEY = ['meteo', 'position'] as const;

// Clé de traduction, comme les messages d'ApiError.
export const LOCATION_DENIED = 'erreurs.localisation';

// Partagée par la météo et le radar. Jamais stockée : seule la météo du lieu est gardée hors ligne.
export async function currentCoords() {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  if (!granted) throw new Error(LOCATION_DENIED);
  // Une position de moins de 10 min suffit, sans attendre le GPS.
  const { coords } =
    (await Location.getLastKnownPositionAsync(TEN_MINUTES)) ??
    (await Location.getCurrentPositionAsync());
  return coords;
}

export async function loadWeather(): Promise<WeatherData> {
  const coords = await currentCoords();
  const [forecast, address] = await Promise.all([
    fetchForecast(coords.latitude, coords.longitude),
    Location.reverseGeocodeAsync(coords.latitude, coords.longitude).catch(() => []),
  ]);
  return { forecast, place: address[0]?.city ?? address[0]?.region ?? null };
}

// Météo d'une ville trouvée par la recherche, `id` étant celui d'Open-Meteo Geocoding.
export const cityQueryKey = (id: string) => ['meteo', 'ville', id] as const;

// Hors geste, au plus un appel météo toutes les 10 min ; tirer (refetch) passe outre.
export const TEN_MINUTES = 10 * 60 * 1000;

// Partagée par l'écran Météo et la ligne « Ma position » des villes : même cache.
export const positionWeatherQuery = queryOptions({
  queryKey: WEATHER_QUERY_KEY,
  queryFn: loadWeather,
  staleTime: TEN_MINUTES,
});

// Partagée par l'écran ville et la liste des favoris : même cache.
export const cityWeatherQuery = (city: City) =>
  queryOptions({
    queryKey: cityQueryKey(String(city.id)),
    queryFn: async (): Promise<WeatherData> => ({
      forecast: await fetchForecast(city.latitude, city.longitude),
      place: city.name,
    }),
    staleTime: TEN_MINUTES,
    // Le nom suit le favori, retraduit au changement de langue, sans attendre un nouvel appel.
    select: (data) => ({ ...data, place: city.name }),
  });

// `region` manque pour certaines villes (micro-États, territoires).
export type City = {
  id: number;
  name: string;
  region: string | null;
  country: string;
  latitude: number;
  longitude: number;
};

export type ApiErrorKind = 'reseau' | 'http' | 'delai' | 'donnees';

// Le message est une clé de traduction (« erreurs.reseau »), traduite à l'affichage : une erreur
// déjà affichée change de langue avec l'app. `status` n'existe que pour `http`.
export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    readonly status?: number,
  ) {
    super(`erreurs.${kind}`);
  }
}

const TIMEOUT = 10_000;

// Seul point d'accès au réseau : délai maximum, réponse validée, erreur classée.
async function getJson<T>(url: string, schema: z.ZodType<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  // Après notre abort, fetch et json() rejettent : c'est le délai, pas le réseau ni les données.
  const fail = (kind: ApiErrorKind) => () => {
    throw new ApiError(controller.signal.aborted ? 'delai' : kind);
  };
  try {
    const res = await fetch(url, { signal: controller.signal }).catch(fail('reseau'));
    if (!res.ok) throw new ApiError('http', res.status);
    const parsed = schema.safeParse(await res.json().catch(fail('donnees')));
    if (!parsed.success) throw new ApiError('donnees');
    return parsed.data;
  } finally {
    clearTimeout(timer);
  }
}

// Pannes passagères seulement, deux fois au plus : ni le refus de localisation ni des données
// invalides ne s'arrangent en réessayant.
export const shouldRetry = (failureCount: number, error: Error) =>
  failureCount < 2 &&
  error instanceof ApiError &&
  (error.kind === 'reseau' || error.kind === 'delai' || (error.status ?? 0) >= 500);

const placeSchema = z.object({
  id: z.number(),
  name: z.string(),
  admin1: z.string().optional(),
  country: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
});
// Sans résultat, la réponse n'a pas de clé `results`.
const geocodingSchema = z.object({ results: z.array(placeSchema).optional() });

const toCity = (r: z.infer<typeof placeSchema>): City => ({
  id: r.id,
  name: r.name,
  region: r.admin1 ?? null,
  country: r.country ?? '',
  latitude: r.latitude,
  longitude: r.longitude,
});

// API Geocoding d'Open-Meteo : https://open-meteo.com/en/docs/geocoding-api
// Noms de ville, de région et de pays dans `language` quand l'API les connaît.
const GEOCODING = 'https://geocoding-api.open-meteo.com/v1';

export async function searchCities(name: string, language: Language): Promise<City[]> {
  const params = new URLSearchParams({ name, count: '10', language });
  const data = await getJson(`${GEOCODING}/search?${params}`, geocodingSchema);
  return (data.results ?? []).map(toCity);
}

// Une ville par son `id`, pour retraduire un favori.
export async function getCity(id: number, language: Language): Promise<City> {
  const params = new URLSearchParams({ id: String(id), language });
  return toCity(await getJson(`${GEOCODING}/get?${params}`, placeSchema));
}

// API Air Quality d'Open-Meteo : https://open-meteo.com/en/docs/air-quality-api
// Heures comme celles des prévisions (heure locale du lieu, 7 jours de 00:00 à 23:00).
// Images radar RainViewer (gratuit, sans clé) : https://www.rainviewer.com/api/weather-maps-api.html
const radarSchema = z.object({
  host: z.string(),
  radar: z.object({ past: z.array(z.object({ path: z.string() })).min(1) }),
});

// Modèle d'URL des tuiles de la dernière image : 256 px, couleurs « Universal Blue » (2, la seule
// de l'offre gratuite), lissées, neige en couleur à part. Pas de tuiles au-delà du zoom 7.
export const RADAR_MAX_ZOOM = 7;
export const radarTilesQuery = queryOptions({
  queryKey: ['radar', 'tuiles'],
  queryFn: async () => {
    const { host, radar } = await getJson(
      'https://api.rainviewer.com/public/weather-maps.json',
      radarSchema,
    );
    return `${host}${radar.past[radar.past.length - 1].path}/256/{z}/{x}/{y}/2/1_1.png`;
  },
  staleTime: TEN_MINUTES,
});

export async function fetchAirQuality(latitude: number, longitude: number) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    // L'indice global, puis la concentration et le sous-indice de chaque polluant.
    current: ['european_aqi', ...POLLUTANTS, ...POLLUTANTS.map((p) => `european_aqi_${p}`)].join(),
    hourly: 'european_aqi',
    timezone: 'auto',
    forecast_days: '7',
  });
  const data = await getJson(
    `https://air-quality-api.open-meteo.com/v1/air-quality?${params}`,
    airQualitySchema,
  );
  const { current } = data;
  const index = current.european_aqi;
  return {
    current:
      index === null
        ? null
        : {
            index,
            pollutants: POLLUTANTS.flatMap((key) => {
              const value = current[key];
              const sub = current[`european_aqi_${key}`];
              return value === null || sub === null ? [] : [{ key, value, index: sub }];
            }),
          },
    hourly: new Map(data.hourly.time.map((time, i) => [time, data.hourly.european_aqi[i]])),
  };
}

// Paliers officiels de l'indice européen : bon (≤ 20), correct, moyen, mauvais, très mauvais
// (≤ 100), extrêmement mauvais. Rang 0 à 5, qui choisit libellé et couleur.
export const AIR_LEVELS = [
  'bon',
  'correct',
  'moyen',
  'mauvais',
  'tresMauvais',
  'extremementMauvais',
] as const;

// Borne haute de chaque palier, de bon à très mauvais.
export const AIR_LIMITS = [20, 40, 60, 80, 100];

export const airQualityLevel = (aqi: number) => AIR_LIMITS.filter((limit) => aqi > limit).length;

// Paliers de l'OMS de l'indice UV, sur l'indice arrondi : faible (≤ 2), modéré (≤ 5), élevé (≤ 7),
// très élevé (≤ 10), extrême. Rang 0 à 4, qui choisit libellé et couleur.
export const UV_LEVELS = ['faible', 'modere', 'eleve', 'tresEleve', 'extreme'] as const;

export const uvLevel = (uv: number) =>
  [3, 6, 8, 11].filter((limit) => Math.round(uv) >= limit).length;

export async function fetchForecast(latitude: number, longitude: number): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current:
      'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day,uv_index',
    hourly: 'temperature_2m,weather_code,precipitation_probability,is_day,uv_index',
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,precipitation_probability_max,uv_index_max',
    timezone: 'auto',
    forecast_days: '7',
  });
  // L'air est un service à part : en panne, la météo s'affiche quand même, sans sa carte.
  const [data, air] = await Promise.all([
    getJson(`https://api.open-meteo.com/v1/forecast?${params}`, forecastSchema),
    fetchAirQuality(latitude, longitude).catch(() => null),
  ]);

  return {
    current: {
      time: data.current.time,
      temperature: data.current.temperature_2m,
      apparentTemperature: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      windSpeed: data.current.wind_speed_10m,
      weatherCode: data.current.weather_code,
      isDay: data.current.is_day === 1,
      airQuality: air?.current ?? null,
      uvIndex: data.current.uv_index,
    },
    hourly: data.hourly.time.map((time, i) => ({
      time,
      weatherCode: data.hourly.weather_code[i],
      temperature: data.hourly.temperature_2m[i],
      rainChance: data.hourly.precipitation_probability[i],
      isDay: data.hourly.is_day[i] === 1,
      // Associée par l'heure, pas par le rang : les deux services peuvent ne pas commencer pareil.
      airQuality: air?.hourly.get(time) ?? null,
      uvIndex: data.hourly.uv_index[i],
    })),
    daily: data.daily.time.map((date, i) => ({
      date,
      weatherCode: data.daily.weather_code[i],
      min: data.daily.temperature_2m_min[i],
      max: data.daily.temperature_2m_max[i],
      sunrise: data.daily.sunrise[i],
      sunset: data.daily.sunset[i],
      precipitation: data.daily.precipitation_sum[i],
      rainChance: data.daily.precipitation_probability_max[i],
      uvMax: data.daily.uv_index_max[i],
    })),
  };
}

// Les précipitations peuvent manquer (`null`) sur certaines heures ou certains lieux : 0.
const numbers = z.array(z.number());
const maybeNumbers = z.array(
  z
    .number()
    .nullable()
    .transform((n) => n ?? 0),
);
const strings = z.array(z.string());
// Toute valeur de l'air ou de l'UV peut manquer (`null`) : hors couverture, au-delà de l'horizon.
const maybeNumber = z.number().nullable();
const forecastSchema = z.object({
  current: z.object({
    time: z.string(),
    temperature_2m: z.number(),
    apparent_temperature: z.number(),
    relative_humidity_2m: z.number(),
    wind_speed_10m: z.number(),
    weather_code: z.number(),
    is_day: z.number(),
    uv_index: maybeNumber,
  }),
  hourly: z.object({
    time: strings,
    temperature_2m: numbers,
    weather_code: numbers,
    precipitation_probability: maybeNumbers,
    is_day: numbers,
    uv_index: z.array(maybeNumber),
  }),
  daily: z.object({
    time: strings,
    weather_code: numbers,
    temperature_2m_max: numbers,
    temperature_2m_min: numbers,
    sunrise: strings,
    sunset: strings,
    precipitation_sum: maybeNumbers,
    precipitation_probability_max: maybeNumbers,
    uv_index_max: z.array(maybeNumber),
  }),
});

const airQualitySchema = z.object({
  current: z.object({
    european_aqi: maybeNumber,
    pm2_5: maybeNumber,
    pm10: maybeNumber,
    nitrogen_dioxide: maybeNumber,
    ozone: maybeNumber,
    sulphur_dioxide: maybeNumber,
    european_aqi_pm2_5: maybeNumber,
    european_aqi_pm10: maybeNumber,
    european_aqi_nitrogen_dioxide: maybeNumber,
    european_aqi_ozone: maybeNumber,
    european_aqi_sulphur_dioxide: maybeNumber,
  }),
  hourly: z.object({ time: strings, european_aqi: z.array(maybeNumber) }),
});

// Codes météo WMO : https://open-meteo.com/en/docs#weathervariables
// Le temps prime sur l'heure pour le thème : de la pluie la nuit garde le fond pluie.
export function describeWeather(
  code: number,
  isDay = true,
): { label: string; icon: IconName; theme: WeatherTheme } {
  const sky = isDay ? 'jour' : 'nuit';
  const weather = (key: string, icon: IconName, theme: WeatherTheme) => ({
    label: i18n.t(`temps.${key}`),
    icon,
    theme,
  });
  if (code === 0) return weather('degage', isDay ? 'sunny' : 'moon', sky);
  if (code <= 2) return weather('peuNuageux', isDay ? 'partly-sunny' : 'cloudy-night', sky);
  if (code === 3) return weather('couvert', 'cloudy', sky);
  if (code <= 48) return weather('brouillard', 'cloud-outline', sky);
  if (code <= 57) return weather('bruine', 'rainy-outline', 'pluie');
  if (code <= 67) return weather('pluie', 'rainy', 'pluie');
  if (code <= 77) return weather('neige', 'snow', 'neige');
  if (code <= 82) return weather('averses', 'rainy', 'pluie');
  if (code <= 86) return weather('aversesNeige', 'snow', 'neige');
  return weather('orage', 'thunderstorm', 'orage');
}

export type WeatherTheme = 'jour' | 'nuit' | 'pluie' | 'neige' | 'orage';

// Place de la barre min–max d'un jour sur l'échelle de la semaine [lo, hi], en %.
export function temperatureBar(min: number, max: number, lo: number, hi: number) {
  const span = hi - lo || 1;
  return { left: ((min - lo) / span) * 100, width: ((max - min) / span) * 100 };
}
