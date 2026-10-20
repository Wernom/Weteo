import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import i18n, { formatHour } from './i18n';
import { DayIndexCard, IndexCard, IndexDot, type Scale } from './IndexCard';
import { airQualityColor, font, type Palette, space, themedStyles, usePalette } from './theme';
import {
  AIR_LEVELS,
  airQualityLevel,
  type AirQuality,
  type HourlyForecast,
  type Pollutant,
} from './weather';

// Symboles des polluants, les mêmes dans toutes les langues ; les noms complets sont traduits.
const SYMBOLS: Record<Pollutant, string> = {
  pm2_5: 'PM2.5',
  pm10: 'PM10',
  nitrogen_dioxide: 'NO₂',
  ozone: 'O₃',
  sulphur_dioxide: 'SO₂',
};

// « Correct » pour 36. Les composants appellent useTranslation() pour suivre la langue.
const levelLabel = (aqi: number) => i18n.t(`air.niveaux.${AIR_LEVELS[airQualityLevel(aqi)]}`);

const airScale =
  (c: Palette): Scale =>
  (aqi) => ({ label: levelLabel(aqi), color: airQualityColor(c, aqi) });

// Qualité de l'air de l'écran Météo : indice et palier actuels, polluants, puis heure par heure.
// `hours` sont celles du bandeau météo ; la première est l'heure en cours.
export function AirQualityCard({
  air,
  hours,
}: {
  air: AirQuality | null;
  hours: HourlyForecast[];
}) {
  const { t } = useTranslation();
  const c = usePalette();
  const styles = useStyles();
  if (!air) return null;

  return (
    <IndexCard
      id="air"
      testID="qualite-air"
      title={t('meteo.qualiteAir')}
      value={air.index}
      scale={airScale(c)}
      a11yKey="meteo.qualiteAirDetail"
      hourA11yKey="meteo.airHeureDetail"
      hours={hours}
      // Au-delà de l'horizon des prévisions de l'air, les heures n'ont pas d'indice.
      pick={(hour) => hour.airQuality}
    >
      <View style={styles.pollutants}>
        {air.pollutants.map((p) => (
          <View
            key={p.key}
            testID={`polluant-${p.key}`}
            style={styles.pollutant}
            accessible
            accessibilityLabel={t('meteo.polluantDetail', {
              name: t(`air.polluants.${p.key}`),
              count: Math.round(p.value),
              level: levelLabel(p.index),
            })}
          >
            <IndexDot color={airQualityColor(c, p.index)} size={8} />
            <Text style={styles.symbol}>{SYMBOLS[p.key]}</Text>
            <Text style={styles.value}>{Math.round(p.value)} µg/m³</Text>
          </View>
        ))}
      </View>
    </IndexCard>
  );
}

// Qualité de l'air de l'écran du jour : la pire heure, sauf si le jour est au-delà de l'horizon.
export function DayAirQualityCard({ hours }: { hours: HourlyForecast[] }) {
  const { t } = useTranslation();
  const c = usePalette();
  let peak: { time: string; index: number } | undefined;
  for (const { time, airQuality } of hours) {
    if (airQuality !== null && (!peak || airQuality > peak.index))
      peak = { time, index: airQuality };
  }
  if (!peak) return null;

  return (
    <DayIndexCard
      testID="qualite-air-jour"
      title={t('meteo.qualiteAir')}
      color={airQualityColor(c, peak.index)}
      text={t('jour.qualiteAirMax', {
        index: peak.index,
        level: levelLabel(peak.index),
        hour: formatHour(peak.time),
      })}
    />
  );
}

const useStyles = themedStyles((c) => ({
  pollutants: { flexDirection: 'row', flexWrap: 'wrap', gap: space.m, marginTop: space.m },
  pollutant: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  symbol: { color: c.secondary, fontSize: font.size.footnote, fontWeight: font.weight.semibold },
  value: { color: c.text, fontSize: font.size.footnote },
}));
