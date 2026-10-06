import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { describeWeather, HourlyForecast, iconColor } from './weather';

// Bandeau horizontal des prochaines heures ; la première est l'heure en cours.
export function HourlyStrip({ hours }: { hours: HourlyForecast[] }) {
  return (
    <ScrollView
      testID="bandeau-horaire"
      horizontal
      // Android : sans ça, le balayage entre villes (onglet Météo) vole le geste au bandeau.
      nestedScrollEnabled
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
    >
      {hours.map((hour, i) => {
        const d = describeWeather(hour.weatherCode, hour.isDay);
        const label = i === 0 ? 'Maintenant' : hourLabel(hour.time);
        const temperature = `${Math.round(hour.temperature)}°`;
        return (
          <View
            key={hour.time}
            testID={`heure-${i}`}
            style={styles.hour}
            accessible
            accessibilityLabel={`${label}, ${d.label}, ${temperature}, pluie ${hour.rainChance} %`}
          >
            <Text style={styles.time}>{label}</Text>
            <Ionicons name={d.icon} size={28} color={iconColor(d.icon)} />
            <Text style={styles.temp}>{temperature}</Text>
            <Text style={styles.rain}>
              <Ionicons name="water" size={12} color="#cfe3ff" /> {hour.rainChance} %
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

// « 2026-10-05T14:00 » → « 14 h », lue telle quelle : l'heure locale du lieu, pas du téléphone.
export const hourLabel = (time: string) => `${Number(time.slice(11, 13))} h`;

const styles = StyleSheet.create({
  strip: { gap: 4 },
  hour: { alignItems: 'center', gap: 6, minWidth: 64, paddingVertical: 4 },
  time: { color: '#fff', fontSize: 14 },
  temp: { color: '#fff', fontSize: 18, fontWeight: '600' },
  rain: { color: '#cfe3ff', fontSize: 13 },
});
