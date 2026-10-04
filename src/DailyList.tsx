import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { DailyForecast, describeWeather } from './weather';

// Une ligne par jour ; le premier est aujourd'hui. Toucher un jour ouvre son détail.
export function DailyList({ days }: { days: DailyForecast[] }) {
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
            onPress={() => router.push(`/jour/${day.date}`)}
          >
            <Text style={styles.day}>{label}</Text>
            <Ionicons name={d.icon} size={24} color="#fff" />
            <Text style={styles.range}>
              {min}° / {max}°
            </Text>
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

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  day: { flex: 1, color: '#fff', fontSize: 17 },
  range: { color: '#fff', fontSize: 17, minWidth: 90, textAlign: 'right' },
});
