import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import i18n, { formatHour } from './i18n';
import { DayIndexCard, IndexCard, IndexDot, type Scale } from './IndexCard';
import { airQualityColor, font, type Palette, space, themedStyles, usePalette } from './theme';
import {
  AIR_LEVELS,
  AIR_LIMITS,
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

// Indices du palier de rang `i` : « 0–20 », « 21–40 »… puis « > 100 ».
const levelRange = (i: number) =>
  i === AIR_LIMITS.length
    ? `> ${AIR_LIMITS[i - 1]}`
    : `${i === 0 ? 0 : AIR_LIMITS[i - 1] + 1}–${AIR_LIMITS[i]}`;

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
      // Ce que veulent dire l'indice, ses paliers, les polluants et l'heure par heure.
      help={
        <>
          <Text style={styles.help}>{t('air.aide.indice')}</Text>
          {AIR_LEVELS.map((key, i) => (
            <View key={key} style={styles.legend}>
              <IndexDot color={c.airQuality[i]} size={8} />
              <Text style={[styles.value, styles.range]}>{levelRange(i)}</Text>
              <Text style={styles.value}>{t(`air.niveaux.${key}`)}</Text>
            </View>
          ))}
          <Text style={styles.help}>{t('air.aide.polluants')}</Text>
        </>
      }
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
  // Grille de 3 colonnes : les pastilles de la 2e ligne s'alignent sur celles de la 1re.
  pollutants: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.m, marginTop: space.m },
  pollutant: { flexDirection: 'row', alignItems: 'center', gap: space.xs, width: '33.333%' },
  symbol: { color: c.secondary, fontSize: font.size.footnote, fontWeight: font.weight.semibold },
  value: { color: c.text, fontSize: font.size.footnote },
  legend: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  range: { minWidth: 56 },
  help: { color: c.text, fontSize: font.size.footnote, lineHeight: 18 },
}));
