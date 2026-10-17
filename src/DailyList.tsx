import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import i18n, { formatWeekday } from './i18n';
import {
  font,
  iconColor,
  radius,
  space,
  temperatureColor,
  themedStyles,
  usePalette,
} from './theme';
import { useUnits } from './units';
import { DailyForecast, describeWeather, temperatureBar } from './weather';

// Une ligne par jour ; le premier est aujourd'hui. Toucher un jour ouvre son détail,
// celui de la ville `ville` si elle est donnée, sinon celui de ma position.
export function DailyList({ days, ville }: { days: DailyForecast[]; ville?: string }) {
  const { t } = useTranslation();
  const units = useUnits();
  const c = usePalette();
  const styles = useStyles();
  // Barres et couleurs en °C, quelle que soit l'unité affichée.
  // Échelle commune des barres : la plus basse et la plus haute de la semaine.
  const lo = Math.min(...days.map((d) => d.min));
  const hi = Math.max(...days.map((d) => d.max));
  return (
    <>
      {days.map((day, i) => {
        const d = describeWeather(day.weatherCode);
        const label = dayLabel(day.date, i);
        const min = units.temp(day.min);
        const max = units.temp(day.max);
        return (
          <Pressable
            key={day.date}
            testID={`jour-${i}`}
            style={styles.row}
            accessibilityRole="button"
            accessibilityLabel={t('meteo.jourDetail', { day: label, weather: d.label, min, max })}
            onPress={() => router.push(`/jour/${day.date}${ville ? `?ville=${ville}` : ''}`)}
          >
            <Text style={styles.day}>{label}</Text>
            <Ionicons name={d.icon} size={24} color={iconColor(c, d.icon)} />
            <Text style={[styles.temp, styles.min]}>{min}</Text>
            <View style={styles.track}>
              <LinearGradient
                colors={[temperatureColor(c, day.min), temperatureColor(c, day.max)]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.bar, barStyle(day.min, day.max, lo, hi)]}
              />
            </View>
            <Text style={styles.temp}>{max}</Text>
          </Pressable>
        );
      })}
    </>
  );
}

// `index` 0 est aujourd'hui.
export function dayLabel(isoDate: string, index: number) {
  return index === 0 ? i18n.t('meteo.aujourdhui') : formatWeekday(isoDate);
}

function barStyle(min: number, max: number, lo: number, hi: number) {
  const { left, width } = temperatureBar(min, max, lo, hi);
  return { left: `${left}%`, width: `${width}%` } as const;
}

const useStyles = themedStyles((c) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: space.s },
  day: { flex: 1, color: c.text, fontSize: font.size.body },
  temp: {
    color: c.text,
    fontSize: font.size.body,
    fontWeight: font.weight.semibold,
    minWidth: 36,
    textAlign: 'right',
  },
  min: { color: c.secondary, fontWeight: font.weight.regular },
  track: {
    width: 72,
    height: 6,
    borderRadius: radius.xs,
    backgroundColor: c.track,
    overflow: 'hidden',
  },
  // Une barre d'un seul degré reste visible.
  bar: { position: 'absolute', top: 0, bottom: 0, minWidth: 6, borderRadius: radius.xs },
}));
