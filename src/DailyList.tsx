import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  DailyForecast,
  describeWeather,
  iconColor,
  temperatureBar,
  temperatureColor,
} from './weather';

// Une ligne par jour ; le premier est aujourd'hui. Toucher un jour ouvre son détail,
// celui de la ville `ville` si elle est donnée, sinon celui de ma position.
export function DailyList({ days, ville }: { days: DailyForecast[]; ville?: string }) {
  // Échelle commune des barres : la plus basse et la plus haute de la semaine.
  const lo = Math.min(...days.map((d) => d.min));
  const hi = Math.max(...days.map((d) => d.max));
  return (
    <>
      {days.map((day, i) => {
        const d = describeWeather(day.weatherCode);
        const label = dayLabel(day.date, i);
        const min = Math.round(day.min);
        const max = Math.round(day.max);
        return (
          <Pressable
            key={day.date}
            testID={`jour-${i}`}
            style={styles.row}
            accessibilityRole="button"
            accessibilityLabel={`${label}, ${d.label}, minimum ${min}°, maximum ${max}°`}
            onPress={() => router.push(`/jour/${day.date}${ville ? `?ville=${ville}` : ''}`)}
          >
            <Text style={styles.day}>{label}</Text>
            <Ionicons name={d.icon} size={24} color={iconColor(d.icon)} />
            <Text style={[styles.temp, styles.min]}>{min}°</Text>
            <View style={styles.track}>
              <LinearGradient
                colors={[temperatureColor(day.min), temperatureColor(day.max)]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.bar, barStyle(day.min, day.max, lo, hi)]}
              />
            </View>
            <Text style={styles.temp}>{max}°</Text>
          </Pressable>
        );
      })}
    </>
  );
}

// `index` 0 est aujourd'hui.
export function dayLabel(isoDate: string, index: number) {
  return index === 0 ? "Aujourd'hui" : formatDay(isoDate);
}

function formatDay(isoDate: string) {
  const label = new Date(`${isoDate}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function barStyle(min: number, max: number, lo: number, hi: number) {
  const { left, width } = temperatureBar(min, max, lo, hi);
  return { left: `${left}%`, width: `${width}%` } as const;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  day: { flex: 1, color: '#fff', fontSize: 17 },
  temp: { color: '#fff', fontSize: 17, fontWeight: '600', minWidth: 36, textAlign: 'right' },
  min: { color: '#e6efff', fontWeight: '400' },
  track: {
    width: 72,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.2)',
    overflow: 'hidden',
  },
  // Une barre d'un seul degré reste visible.
  bar: { position: 'absolute', top: 0, bottom: 0, minWidth: 6, borderRadius: 3 },
});
