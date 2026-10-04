import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

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

// `region` manque pour certaines villes (micro-États, territoires).
export type City = {
  id: number;
  name: string;
  region: string | null;
  country: string;
  latitude: number;
  longitude: number;
};

// API Geocoding d'Open-Meteo : https://open-meteo.com/en/docs/geocoding-api
export async function searchCities(name: string): Promise<City[]> {
  const params = new URLSearchParams({ name, count: '10', language: 'fr' });
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
  if (!res.ok) {
    throw new Error(`Open-Meteo a répondu ${res.status}`);
  }
  const data = await res.json();
  // Sans résultat, la réponse n'a pas de clé `results`.
  return (data.results ?? []).map((r: any) => ({
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
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) {
    throw new Error(`Open-Meteo a répondu ${res.status}`);
  }
  const data = await res.json();

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
    hourly: data.hourly.time.map((time: string, i: number) => ({
      time,
      weatherCode: data.hourly.weather_code[i],
      temperature: data.hourly.temperature_2m[i],
      rainChance: data.hourly.precipitation_probability[i],
      isDay: data.hourly.is_day[i] === 1,
    })),
    daily: data.daily.time.map((date: string, i: number) => ({
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
export const GRADIENTS: Record<WeatherTheme, readonly [string, string]> = {
  jour: ['#2f6cc4', '#1f4f99'],
  nuit: ['#0f1c3f', '#1f2d5c'],
  pluie: ['#4b5a6b', '#2c3644'],
  neige: ['#5b7083', '#3d4f61'],
  orage: ['#3b3456', '#1e1a2e'],
};
