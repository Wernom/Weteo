import type Ionicons from '@expo/vector-icons/Ionicons';
import { queryOptions } from '@tanstack/react-query';
import type { ComponentProps } from 'react';
import { z } from 'zod';

type IconName = ComponentProps<typeof Ionicons>['name'];

// Client Open-Meteo (gratuit, sans clé API) : https://open-meteo.com/en/docs

// `time` est l'heure locale du lieu (« 2026-10-05T14:15 »), pas celle du téléphone.
export type CurrentWeather = {
  time: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  isDay: boolean;
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
};

// `time` est l'heure locale du lieu (« 2026-10-05T14:00 »), pas celle du téléphone.
export type HourlyForecast = {
  time: string;
  weatherCode: number;
  temperature: number;
  rainChance: number;
  isDay: boolean;
};

// `hourly` couvre les 7 jours de `daily`, de 00:00 à 23:00.
export type Forecast = {
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
};

export type WeatherData = { forecast: Forecast; place: string | null };

export const WEATHER_QUERY_KEY = ['meteo', 'position'] as const;

// Météo d'une ville trouvée par la recherche, `id` étant celui d'Open-Meteo Geocoding.
export const cityQueryKey = (id: string) => ['meteo', 'ville', id] as const;

// Hors geste, au plus un appel météo toutes les 10 min ; tirer (refetch) passe outre.
export const TEN_MINUTES = 10 * 60 * 1000;

// Partagée par l'écran ville et la liste des favoris : même cache.
export const cityWeatherQuery = (city: City) =>
  queryOptions({
    queryKey: cityQueryKey(String(city.id)),
    queryFn: async (): Promise<WeatherData> => ({
      forecast: await fetchForecast(city.latitude, city.longitude),
      place: city.name,
    }),
    staleTime: TEN_MINUTES,
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

const API_MESSAGES: Record<ApiErrorKind, string> = {
  reseau: 'Pas de connexion internet. Vérifiez votre réseau.',
  http: 'Le service météo est indisponible pour le moment.',
  delai: 'Le service météo met trop de temps à répondre.',
  donnees: 'Les données météo reçues sont invalides.',
};

// Le message s'affiche tel quel à l'utilisateur ; `status` n'existe que pour `http`.
export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    readonly status?: number,
  ) {
    super(API_MESSAGES[kind]);
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

// Sans résultat, la réponse n'a pas de clé `results`.
const geocodingSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        admin1: z.string().optional(),
        country: z.string().optional(),
        latitude: z.number(),
        longitude: z.number(),
      }),
    )
    .optional(),
});

// API Geocoding d'Open-Meteo : https://open-meteo.com/en/docs/geocoding-api
export async function searchCities(name: string): Promise<City[]> {
  const params = new URLSearchParams({ name, count: '10', language: 'fr' });
  const data = await getJson(
    `https://geocoding-api.open-meteo.com/v1/search?${params}`,
    geocodingSchema,
  );
  return (data.results ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    region: r.admin1 ?? null,
    country: r.country ?? '',
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

export async function fetchForecast(latitude: number, longitude: number): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current:
      'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day',
    hourly: 'temperature_2m,weather_code,precipitation_probability,is_day',
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '7',
  });
  const data = await getJson(`https://api.open-meteo.com/v1/forecast?${params}`, forecastSchema);

  return {
    current: {
      time: data.current.time,
      temperature: data.current.temperature_2m,
      apparentTemperature: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      windSpeed: data.current.wind_speed_10m,
      weatherCode: data.current.weather_code,
      isDay: data.current.is_day === 1,
    },
    hourly: data.hourly.time.map((time, i) => ({
      time,
      weatherCode: data.hourly.weather_code[i],
      temperature: data.hourly.temperature_2m[i],
      rainChance: data.hourly.precipitation_probability[i],
      isDay: data.hourly.is_day[i] === 1,
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
const forecastSchema = z.object({
  current: z.object({
    time: z.string(),
    temperature_2m: z.number(),
    apparent_temperature: z.number(),
    relative_humidity_2m: z.number(),
    wind_speed_10m: z.number(),
    weather_code: z.number(),
    is_day: z.number(),
  }),
  hourly: z.object({
    time: strings,
    temperature_2m: numbers,
    weather_code: numbers,
    precipitation_probability: maybeNumbers,
    is_day: numbers,
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
  }),
});

// Codes météo WMO : https://open-meteo.com/en/docs#weathervariables
// Le temps prime sur l'heure pour le thème : de la pluie la nuit garde le fond pluie.
export function describeWeather(
  code: number,
  isDay = true,
): { label: string; icon: IconName; theme: WeatherTheme } {
  const sky = isDay ? 'jour' : 'nuit';
  if (code === 0) return { label: 'Ciel dégagé', icon: isDay ? 'sunny' : 'moon', theme: sky };
  if (code <= 2)
    return { label: 'Peu nuageux', icon: isDay ? 'partly-sunny' : 'cloudy-night', theme: sky };
  if (code === 3) return { label: 'Couvert', icon: 'cloudy', theme: sky };
  if (code <= 48) return { label: 'Brouillard', icon: 'cloud-outline', theme: sky };
  if (code <= 57) return { label: 'Bruine', icon: 'rainy-outline', theme: 'pluie' };
  if (code <= 67) return { label: 'Pluie', icon: 'rainy', theme: 'pluie' };
  if (code <= 77) return { label: 'Neige', icon: 'snow', theme: 'neige' };
  if (code <= 82) return { label: 'Averses', icon: 'rainy', theme: 'pluie' };
  if (code <= 86) return { label: 'Averses de neige', icon: 'snow', theme: 'neige' };
  return { label: 'Orage', icon: 'thunderstorm', theme: 'orage' };
}

export type WeatherTheme = 'jour' | 'nuit' | 'pluie' | 'neige' | 'orage';

// Du haut vers le bas ; le texte blanc reste lisible (contraste ≥ 4,5:1) sur chaque couleur.
// Le texte secondaire (#e6efff) aussi.
export const GRADIENTS: Record<WeatherTheme, readonly [string, string, string]> = {
  jour: ['#0a5fd6', '#1565d8', '#3b49c4'],
  nuit: ['#0b1026', '#1e1b4b', '#33307f'],
  pluie: ['#3a4b63', '#465a73', '#1f2a3c'],
  neige: ['#4a6584', '#536782', '#36475e'],
  orage: ['#3b1470', '#5a2aa0', '#1c1840'],
};

// Icônes en couleur, assez claires pour ressortir sur tous les fonds ; blanc par défaut.
const ICON_COLORS: Partial<Record<IconName, string>> = {
  sunny: '#fcd34d',
  'partly-sunny': '#fde68a',
  moon: '#e0e7ff',
  'cloudy-night': '#c7d2fe',
  cloudy: '#e5e7eb',
  'cloud-outline': '#e5e7eb',
  rainy: '#93c5fd',
  'rainy-outline': '#93c5fd',
  thunderstorm: '#fde047',
};
export const iconColor = (icon: IconName) => ICON_COLORS[icon] ?? '#fff';

// Du froid (bleu) au chaud (rouge), pour les barres des 7 jours.
export function temperatureColor(t: number) {
  if (t < 0) return '#93c5fd';
  if (t < 10) return '#67e8f9';
  if (t < 20) return '#a3e635';
  if (t < 28) return '#fbbf24';
  return '#f87171';
}

// Place de la barre min–max d'un jour sur l'échelle de la semaine [lo, hi], en %.
export function temperatureBar(min: number, max: number, lo: number, hi: number) {
  const span = hi - lo || 1;
  return { left: ((min - lo) / span) * 100, width: ((max - min) / span) * 100 };
}
