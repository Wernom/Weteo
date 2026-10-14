import { StyleSheet, useColorScheme } from 'react-native';

import { useSettings } from './settings';
import { describeWeather, type IconName, type WeatherData, type WeatherTheme } from './weather';

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
};

export const PALETTES: Record<Scheme, Palette> = {
  light: {
    gradients: {
      jour: ['#e0f2fe', '#dbeafe', '#c7d7fe'],
      nuit: ['#e0e7ff', '#d4d4f7', '#c4c1f0'],
      pluie: ['#e2e8f0', '#cbd5e1', '#b6c2d2'],
      neige: ['#f8fafc', '#eef2f7', '#dde5ee'],
      orage: ['#ede9fe', '#ddd6fe', '#c9bff5'],
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
    },
    temperatures: ['#2563eb', '#0891b2', '#65a30d', '#d97706', '#dc2626'],
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
    },
    temperatures: ['#93c5fd', '#67e8f9', '#a3e635', '#fbbf24', '#f87171'],
  },
};

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

// Fond du temps actuel, ou du jour tant que la météo n'est pas chargée.
export function gradientFor(c: Palette, data: WeatherData | undefined) {
  const current = data?.forecast.current;
  return c.gradients[current ? describeWeather(current.weatherCode, current.isDay).theme : 'jour'];
}

export const iconColor = (c: Palette, icon: IconName) => c.icons[icon] ?? c.text;

export const temperatureColor = (c: Palette, t: number) =>
  c.temperatures[[0, 10, 20, 28].filter((limit) => t >= limit).length];
