// Client Open-Meteo (gratuit, sans clé API) : https://open-meteo.com/en/docs

export type CurrentWeather = {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  isDay: boolean;
};

export type DailyForecast = {
  date: string;
  weatherCode: number;
  min: number;
  max: number;
};

export type Forecast = {
  current: CurrentWeather;
  daily: DailyForecast[];
};

export async function fetchForecast(latitude: number, longitude: number): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current:
      'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
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
      temperature: data.current.temperature_2m,
      apparentTemperature: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      windSpeed: data.current.wind_speed_10m,
      weatherCode: data.current.weather_code,
      isDay: data.current.is_day === 1,
    },
    daily: data.daily.time.map((date: string, i: number) => ({
      date,
      weatherCode: data.daily.weather_code[i],
      min: data.daily.temperature_2m_min[i],
      max: data.daily.temperature_2m_max[i],
    })),
  };
}

// Codes météo WMO : https://open-meteo.com/en/docs#weathervariables
export function describeWeather(code: number, isDay = true): { label: string; icon: string } {
  if (code === 0) return { label: 'Ciel dégagé', icon: isDay ? '☀️' : '🌙' };
  if (code <= 2) return { label: 'Peu nuageux', icon: isDay ? '🌤️' : '☁️' };
  if (code === 3) return { label: 'Couvert', icon: '☁️' };
  if (code <= 48) return { label: 'Brouillard', icon: '🌫️' };
  if (code <= 57) return { label: 'Bruine', icon: '🌦️' };
  if (code <= 67) return { label: 'Pluie', icon: '🌧️' };
  if (code <= 77) return { label: 'Neige', icon: '🌨️' };
  if (code <= 82) return { label: 'Averses', icon: '🌦️' };
  if (code <= 86) return { label: 'Averses de neige', icon: '🌨️' };
  return { label: 'Orage', icon: '⛈️' };
}
