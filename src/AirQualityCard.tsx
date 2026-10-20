import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';

import i18n, { formatHour } from './i18n';
import { useScreenStyles } from './Screen';
import { airQualityColor, font, radius, space, themedStyles, usePalette } from './theme';
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

// Pastille ronde de la couleur du palier.
function AirDot({ aqi, size, testID }: { aqi: number; size: number; testID?: string }) {
  const c = usePalette();
  return (
    <View
      testID={testID}
      style={{
        width: size,
        height: size,
        borderRadius: radius.pill,
        backgroundColor: airQualityColor(c, aqi),
      }}
    />
  );
}

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
  const shared = useScreenStyles();
  const styles = useStyles();
  if (!air) return null;
  // Au-delà de l'horizon des prévisions de l'air, les heures n'ont pas d'indice.
  const forecast = hours.flatMap((hour, i) =>
    hour.airQuality === null ? [] : [{ i, time: hour.time, index: hour.airQuality }],
  );

  return (
    <View style={shared.card}>
      <Text style={shared.cardTitle}>{t('meteo.qualiteAir')}</Text>
      <View
        testID="qualite-air"
        style={styles.header}
        accessible
        accessibilityLabel={t('meteo.qualiteAirDetail', {
          index: air.index,
          level: levelLabel(air.index),
        })}
      >
        <AirDot aqi={air.index} size={16} testID="pastille-air" />
        <Text style={styles.index}>{air.index}</Text>
        <Text style={styles.level}>{levelLabel(air.index)}</Text>
      </View>

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
            <AirDot aqi={p.index} size={8} />
            <Text style={styles.symbol}>{SYMBOLS[p.key]}</Text>
            <Text style={styles.value}>{Math.round(p.value)} µg/m³</Text>
          </View>
        ))}
      </View>

      {forecast.length > 0 && (
        <ScrollView
          testID="bandeau-air"
          horizontal
          // Android : sans ça, le balayage entre villes (onglet Météo) vole le geste au bandeau.
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.strip}
        >
          {forecast.map(({ i, time, index }) => {
            const label = i === 0 ? t('meteo.maintenant') : formatHour(time);
            return (
              <View
                key={time}
                testID={`air-heure-${i}`}
                style={styles.hour}
                accessible
                accessibilityLabel={t('meteo.airHeureDetail', {
                  hour: label,
                  index,
                  level: levelLabel(index),
                })}
              >
                <Text style={styles.time}>{label}</Text>
                <AirDot aqi={index} size={12} />
                <Text style={styles.hourIndex}>{index}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

// Qualité de l'air de l'écran du jour : la pire heure, sauf si le jour est au-delà de l'horizon.
export function DayAirQualityCard({ hours }: { hours: HourlyForecast[] }) {
  const { t } = useTranslation();
  const shared = useScreenStyles();
  const styles = useStyles();
  let peak: { time: string; index: number } | undefined;
  for (const { time, airQuality } of hours) {
    if (airQuality !== null && (!peak || airQuality > peak.index))
      peak = { time, index: airQuality };
  }
  if (!peak) return null;

  return (
    <View style={shared.card}>
      <Text style={shared.cardTitle}>{t('meteo.qualiteAir')}</Text>
      <View testID="qualite-air-jour" style={styles.header} accessible>
        <AirDot aqi={peak.index} size={16} />
        <Text style={shared.detail}>
          {t('jour.qualiteAirMax', {
            index: peak.index,
            level: levelLabel(peak.index),
            hour: formatHour(peak.time),
          })}
        </Text>
      </View>
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  index: { color: c.text, fontSize: font.size.title2, fontWeight: font.weight.semibold },
  level: { color: c.text, fontSize: font.size.headline, fontWeight: font.weight.medium },
  pollutants: { flexDirection: 'row', flexWrap: 'wrap', gap: space.m, marginTop: space.m },
  pollutant: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  symbol: { color: c.secondary, fontSize: font.size.footnote, fontWeight: font.weight.semibold },
  value: { color: c.text, fontSize: font.size.footnote },
  strip: { gap: space.xs, marginTop: space.m },
  hour: { alignItems: 'center', gap: space.xs, minWidth: 56, paddingVertical: space.xs },
  time: { color: c.text, fontSize: font.size.small },
  hourIndex: { color: c.text, fontSize: font.size.subhead, fontWeight: font.weight.semibold },
}));
