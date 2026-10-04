import Ionicons from '@expo/vector-icons/Ionicons';
import type { UseQueryResult } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import type { Ref } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DailyList } from './DailyList';
import { HourlyStrip } from './HourlyStrip';
import { describeWeather, GRADIENTS, WeatherData } from './weather';

// Fond du temps actuel, ou du jour tant que la météo n'est pas chargée.
export function gradientFor(data: WeatherData | undefined) {
  const current = data?.forecast.current;
  return GRADIENTS[current ? describeWeather(current.weatherCode, current.isDay).theme : 'jour'];
}

// Météo d'un lieu (ma position ou une ville) : chargement, erreur avec « Réessayer », puis le détail.
// `ville` est passé au détail d'un jour pour qu'il lise la météo de la bonne ville.
// `position` signale ma position, pour ne pas la confondre avec un favori de la même ville.
// `scrollRef` et `onScroll` laissent l'écran Météo aligner le défilement de ses pages.
export function WeatherView({
  query: { data, error, isFetching, isRefetching, refetch },
  ville,
  position,
  scrollRef,
  onScroll,
}: {
  query: UseQueryResult<WeatherData>;
  ville?: string;
  position?: boolean;
  scrollRef?: Ref<ScrollView>;
  onScroll?: ScrollViewProps['onScroll'];
}) {
  const reload = () => refetch();
  const gradient = gradientFor(data);

  if (!data) {
    return (
      <LinearGradient colors={gradient} style={[styles.container, styles.center]}>
        {isFetching ? (
          <ActivityIndicator size="large" color="#fff" />
        ) : (
          <>
            <Text style={styles.error}>{error?.message || 'Impossible de charger la météo.'}</Text>
            <Pressable style={styles.button} onPress={reload}>
              <Text style={styles.buttonText}>Réessayer</Text>
            </Pressable>
          </>
        )}
      </LinearGradient>
    );
  }

  const { current, hourly, daily } = data.forecast;
  const now = describeWeather(current.weatherCode, current.isDay);
  // Le bandeau part de l'heure en cours (« 2026-10-05T14:00 » >= « 2026-10-05T14 »).
  const start = hourly.findIndex((h) => h.time >= current.time.slice(0, 13));

  return (
    <LinearGradient testID="fond-meteo" colors={gradient} style={styles.container}>
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={reload} tintColor="#fff" />
        }
      >
        {position && data.place && (
          <View testID="mention-position" style={styles.position}>
            <Ionicons name="navigate" size={14} color="#e6efff" accessible={false} />
            <Text style={styles.positionText}>Ma position</Text>
          </View>
        )}
        <Text style={styles.place}>{data.place ?? 'Ma position'}</Text>
        <Ionicons name={now.icon} size={80} color="#fff" style={styles.icon} accessible={false} />
        <Text style={styles.temp} maxFontSizeMultiplier={1.5}>
          {Math.round(current.temperature)}°
        </Text>
        <Text style={styles.label}>{now.label}</Text>

        <View style={[styles.card, styles.details]}>
          <Text style={styles.detail}>Ressenti {Math.round(current.apparentTemperature)}°</Text>
          <Text style={styles.detail}>Humidité {current.humidity}%</Text>
          <Text style={styles.detail}>Vent {Math.round(current.windSpeed)} km/h</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Heure par heure</Text>
          <HourlyStrip hours={hourly.slice(start, start + 48)} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Prévisions sur 7 jours</Text>
          <DailyList days={daily} ville={ville} />
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  position: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  positionText: { color: '#e6efff', fontSize: 15, fontWeight: '600', textTransform: 'uppercase' },
  place: { color: '#fff', fontSize: 28, fontWeight: '600', textAlign: 'center' },
  icon: { marginTop: 16 },
  temp: { color: '#fff', fontSize: 96, fontWeight: '200' },
  label: { color: '#fff', fontSize: 22, textAlign: 'center' },
  card: {
    alignSelf: 'stretch',
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  details: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', gap: 8 },
  detail: { color: '#fff', fontSize: 15 },
  cardTitle: { color: '#e6efff', fontSize: 14, marginBottom: 8, textTransform: 'uppercase' },
  error: { color: '#fff', fontSize: 18, textAlign: 'center', marginBottom: 16 },
  button: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  buttonText: { color: GRADIENTS.jour[1], fontSize: 16, fontWeight: '600' },
});
