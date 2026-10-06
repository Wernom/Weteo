import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { dayLabel } from '../../DailyList';
import { TemperatureChart } from '../../TemperatureChart';
import { cardStyles } from '../../WeatherView';
import {
  cityQueryKey,
  describeWeather,
  GRADIENTS,
  iconColor,
  WEATHER_QUERY_KEY,
  WeatherData,
} from '../../weather';

export { ErrorBoundary } from '../../ErrorScreen';

export default function DayScreen() {
  const { date, ville } = useLocalSearchParams<{ date: string; ville?: string }>();
  // On arrive depuis la liste 7 jours de ma position ou d'une ville : sa météo est déjà en cache.
  const key = ville ? cityQueryKey(ville) : WEATHER_QUERY_KEY;
  const forecast = useQueryClient().getQueryData<WeatherData>(key)?.forecast;
  const index = forecast?.daily.findIndex((d) => d.date === date) ?? -1;
  if (!forecast || index === -1) return <Redirect href="/" />;

  const day = forecast.daily[index];
  const hours = forecast.hourly.filter((h) => h.time.startsWith(date));
  const d = describeWeather(day.weatherCode);
  const gradient = GRADIENTS[d.theme];
  // Heures lues telles quelles : c'est l'heure locale du lieu, pas celle du téléphone.
  const clock = (iso: string) => iso.slice(11, 16);
  const precipitation = day.precipitation.toLocaleString('fr-FR', { maximumFractionDigits: 1 });

  return (
    <LinearGradient colors={gradient} style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: dayLabel(date, index),
          headerTransparent: true,
          headerTintColor: '#fff',
          headerBackTitle: 'Météo',
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Ionicons name={d.icon} size={64} color={iconColor(d.icon)} accessible={false} />
        <Text style={styles.label}>{d.label}</Text>
        <Text style={styles.range}>
          {Math.round(day.min)}° / {Math.round(day.max)}°
        </Text>

        <View style={cardStyles.card}>
          <Text style={cardStyles.cardTitle}>Températures</Text>
          <TemperatureChart hours={hours} />
        </View>

        <View style={[cardStyles.card, cardStyles.details]}>
          <Text style={cardStyles.detail}>
            Précipitations {precipitation} mm · {day.rainChance} %
          </Text>
          <Text style={cardStyles.detail}>Lever {clock(day.sunrise)}</Text>
          <Text style={cardStyles.detail}>Coucher {clock(day.sunset)}</Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    alignItems: 'center',
    paddingTop: 110,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  label: { color: '#fff', fontSize: 22, textAlign: 'center', marginTop: 8 },
  range: { color: '#fff', fontSize: 28, fontWeight: '300', marginTop: 4 },
});
