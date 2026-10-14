import { useTranslation } from 'react-i18next';

import { PrecipitationUnit, TemperatureUnit, useSettings, WindUnit } from './settings';

// La météo reste en °C, km/h et mm, telle que reçue : on ne convertit qu'à l'affichage.
// Changer d'unité est donc immédiat, hors ligne compris, sans recharger la météo.

// Sans arrondi : la courbe des températures en a besoin pour rester lisse.
export const toTemperature = (celsius: number, unit: TemperatureUnit) =>
  unit === 'fahrenheit' ? (celsius * 9) / 5 + 32 : celsius;

const PER_KMH: Record<WindUnit, number> = { kmh: 1, ms: 1 / 3.6, mph: 1 / 1.609344, kn: 1 / 1.852 };
export const toWind = (kmh: number, unit: WindUnit) => Math.round(kmh * PER_KMH[unit]);

// « 12° » : une température déjà dans l'unité des réglages (la courbe convertit elle-même).
export const formatDegrees = (value: number) => `${Math.round(value)}°`;

export const toPrecipitation = (mm: number, unit: PrecipitationUnit) =>
  unit === 'inch' ? mm / 25.4 : mm;

// Formateurs dans les unités des réglages ; le composant se redessine quand elles changent.
export function useUnits() {
  const { t, i18n } = useTranslation();
  const { temperature, wind, precipitation } = useSettings();
  return {
    degrees: (celsius: number) => toTemperature(celsius, temperature),
    temp: (celsius: number) => formatDegrees(toTemperature(celsius, temperature)),
    wind: (kmh: number) => `${toWind(kmh, wind)} ${t(`unites.${wind}`)}`,
    // Des pouces demandent un chiffre de plus : 0,1 mm ≈ 0,004 in.
    rain: (mm: number) =>
      `${toPrecipitation(mm, precipitation).toLocaleString(i18n.language, {
        maximumFractionDigits: precipitation === 'inch' ? 2 : 1,
      })} ${t(`unites.${precipitation}`)}`,
  };
}
