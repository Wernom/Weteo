import { StyleSheet, useColorScheme } from 'react-native';

import { useSettings } from './settings';
import { createStore } from './store';
import {
  airQualityLevel,
  describeWeather,
  type IconName,
  type WeatherData,
  type WeatherTheme,
} from './weather';

type Scheme = 'light' | 'dark';

// Couleurs d'un thème. Le contraste du texte (≥ 4,5:1) et des icônes (≥ 3:1) sur chaque
// couleur des dégradés et des cartes est vérifié par src/__tests__/theme.test.ts.
export type Palette = {
  // Du haut vers le bas ; le bas prolonge aussi la barre d'onglets.
  gradients: Record<WeatherTheme, readonly [string, string, string]>;
  text: string;
  secondary: string;
  // Cartes, champ de recherche et lignes posés sur le dégradé.
  surface: string;
  border: string;
  track: string;
  textShadow: string;
  // Bouton « Réessayer » et bulle de la courbe : plein, contrasté sur le dégradé.
  inverse: string;
  onInverse: string;
  icons: Partial<Record<IconName, string>>;
  // Barres des 7 jours, du froid au chaud : < 0, < 10, < 20, < 28, au-delà (en °C).
  temperatures: readonly [string, string, string, string, string];
  // Pastilles de la qualité de l'air, du bon à l'extrêmement mauvais (paliers de AIR_LEVELS).
  airQuality: readonly [string, string, string, string, string, string];
};

export const PALETTES: Record<Scheme, Palette> = {
  light: {
    gradients: {
      jour: ['#b5e1ff', '#b0d2ff', '#9cb9ff'],
      nuit: ['#d3ddff', '#c8c8f6', '#b8b5ef'],
      pluie: ['#dae2ed', '#c2cfde', '#adbcd0'],
      neige: ['#bed3e7', '#b5c9e1', '#a5bdd8'],
      orage: ['#e2dcfe', '#d2c8ff', '#beb2f5'],
    },
    text: '#0f172a',
    secondary: '#334155',
    surface: 'rgba(255,255,255,0.55)',
    border: 'rgba(15,23,42,0.12)',
    track: 'rgba(15,23,42,0.12)',
    textShadow: 'transparent',
    inverse: '#1e40af',
    onInverse: '#ffffff',
    icons: {
      sunny: '#92400e',
      'partly-sunny': '#854d0e',
      moon: '#4338ca',
      'cloudy-night': '#4f46e5',
      cloudy: '#475569',
      'cloud-outline': '#475569',
      rainy: '#1d4ed8',
      'rainy-outline': '#1d4ed8',
      thunderstorm: '#854d0e',
      snow: '#0369a1',
    },
    temperatures: ['#2563eb', '#0e7490', '#4d7c0f', '#b45309', '#dc2626'],
    airQuality: ['#0e7490', '#15803d', '#a16207', '#c2410c', '#b91c1c', '#7e22ce'],
  },
  dark: {
    gradients: {
      jour: ['#0a5fd6', '#1565d8', '#3b49c4'],
      nuit: ['#0b1026', '#1e1b4b', '#33307f'],
      pluie: ['#3a4b63', '#465a73', '#1f2a3c'],
      neige: ['#4a6584', '#536782', '#36475e'],
      orage: ['#3b1470', '#5a2aa0', '#1c1840'],
    },
    text: '#ffffff',
    secondary: '#e6efff',
    surface: 'rgba(0,0,0,0.15)',
    border: 'rgba(255,255,255,0.3)',
    track: 'rgba(0,0,0,0.2)',
    textShadow: 'rgba(0,0,0,0.25)',
    inverse: '#ffffff',
    onInverse: '#1565d8',
    icons: {
      sunny: '#fcd34d',
      'partly-sunny': '#fde68a',
      moon: '#e0e7ff',
      'cloudy-night': '#c7d2fe',
      cloudy: '#e5e7eb',
      'cloud-outline': '#e5e7eb',
      rainy: '#a5cdfd',
      'rainy-outline': '#a5cdfd',
      thunderstorm: '#fde047',
      snow: '#e0f2fe',
    },
    temperatures: ['#93c5fd', '#67e8f9', '#a3e635', '#fbbf24', '#fecaca'],
    airQuality: ['#67e8f9', '#86efac', '#fde047', '#fdba74', '#fca5a5', '#d8b4fe'],
  },
};

// Échelles communes aux StyleSheet (en dp).
export const space = { xxs: 2, xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 24, xxxl: 32, xxxxl: 40 };

export const radius = { xs: 3, s: 4, m: 8, l: 20, pill: 999 };

export const font = {
  size: {
    caption: 12,
    footnote: 13,
    small: 14,
    subhead: 15,
    button: 16,
    body: 17,
    headline: 18,
    title3: 22,
    title2: 26,
    title1: 28,
    hero: 112,
  },
  weight: { thin: '200', light: '300', regular: '400', medium: '500', semibold: '600' },
} as const;

// Thème des réglages, ou celui du téléphone tant que l'utilisateur n'a pas choisi.
export function useScheme(): Scheme {
  const phone = useColorScheme();
  const { theme } = useSettings();
  if (theme !== 'system') return theme;
  return phone === 'dark' ? 'dark' : 'light';
}

export const usePalette = () => PALETTES[useScheme()];

// Feuilles de style des deux thèmes, créées une fois ; le hook renvoie celle du thème affiché.
export function themedStyles<T extends StyleSheet.NamedStyles<T>>(make: (c: Palette) => T) {
  const sheets = {
    light: StyleSheet.create(make(PALETTES.light)),
    dark: StyleSheet.create(make(PALETTES.dark)),
  };
  return () => sheets[useScheme()];
}

// Thème du temps actuel, ou du jour tant que la météo n'est pas chargée.
export function weatherTheme(data: WeatherData | undefined): WeatherTheme {
  const current = data?.forecast.current;
  return current ? describeWeather(current.weatherCode, current.isDay).theme : 'jour';
}

export const gradientFor = (c: Palette, data: WeatherData | undefined) =>
  c.gradients[weatherTheme(data)];

// Thème de la page Météo affichée : la barre d'onglets prolonge son dégradé sur tous les onglets.
// Conservé, pour que la barre ait la bonne couleur dès le lancement.
export const tabBarTheme = createStore<WeatherTheme>('fondOnglets', (stored) => stored ?? 'jour');

export const iconColor = (c: Palette, icon: IconName) => c.icons[icon] ?? c.text;

export const temperatureColor = (c: Palette, t: number) =>
  c.temperatures[[0, 10, 20, 28].filter((limit) => t >= limit).length];

export const airQualityColor = (c: Palette, aqi: number) => c.airQuality[airQualityLevel(aqi)];
