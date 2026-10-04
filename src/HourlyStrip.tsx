import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { describeWeather, HourlyForecast } from './weather';

// Bandeau horizontal des prochaines heures ; la première est l'heure en cours.
export function HourlyStrip({ hours }: { hours: HourlyForecast[] }) {
  return (
    <ScrollView
      testID="bandeau-horaire"
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
    >
      {hours.map((hour, i) => {
        const d = describeWeather(hour.weatherCode, hour.isDay);
        // L'heure est lue telle quelle : c'est l'heure locale du lieu, pas celle du téléphone.
        const label = i === 0 ? 'Maintenant' : `${Number(hour.time.slice(11, 13))} h`;
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
            <Ionicons name={d.icon} size={28} color="#fff" />
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

const styles = StyleSheet.create({
  strip: { gap: 4 },
  hour: { alignItems: 'center', gap: 6, minWidth: 64, paddingVertical: 4 },
  time: { color: '#fff', fontSize: 14 },
  temp: { color: '#fff', fontSize: 18, fontWeight: '600' },
  rain: { color: '#cfe3ff', fontSize: 13 },
});
