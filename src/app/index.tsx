import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Location from 'expo-location';

import { describeWeather, fetchForecast, Forecast } from '../weather';

export default function WeatherScreen() {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [place, setPlace] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadWeather()
      .then((result) => {
        if (cancelled) return;
        setForecast(result.forecast);
        setPlace(result.place);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Impossible de charger la météo.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const reload = () => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  };

  if (loading && !forecast) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (error && !forecast) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.error}>{error}</Text>
        <Pressable style={styles.button} onPress={reload}>
          <Text style={styles.buttonText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  if (!forecast) return null;

  const { current, daily } = forecast;
  const now = describeWeather(current.weatherCode, current.isDay);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor="#fff" />}
    >
      <Text style={styles.place}>{place ?? 'Ma position'}</Text>
      <Text style={styles.icon}>{now.icon}</Text>
      <Text style={styles.temp}>{Math.round(current.temperature)}°</Text>
      <Text style={styles.label}>{now.label}</Text>
      <Text style={styles.details}>
        Ressenti {Math.round(current.apparentTemperature)}° · Humidité {current.humidity}% · Vent{' '}
        {Math.round(current.windSpeed)} km/h
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Prévisions sur 7 jours</Text>
        {daily.map((day, i) => {
          const d = describeWeather(day.weatherCode);
          return (
            <View key={day.date} style={styles.row}>
              <Text style={styles.day}>{i === 0 ? "Aujourd'hui" : formatDay(day.date)}</Text>
              <Text style={styles.rowIcon}>{d.icon}</Text>
              <Text style={styles.range}>
                {Math.round(day.min)}° / {Math.round(day.max)}°
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

async function loadWeather(): Promise<{ forecast: Forecast; place: string | null }> {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  if (!granted) {
    throw new Error('Autorise la localisation pour voir la météo autour de toi.');
  }
  const { coords } = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const [forecast, address] = await Promise.all([
    fetchForecast(coords.latitude, coords.longitude),
    Location.reverseGeocodeAsync(coords).catch(() => []),
  ]);
  return { forecast, place: address[0]?.city ?? address[0]?.region ?? null };
}

function formatDay(isoDate: string) {
  const label = new Date(`${isoDate}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3a7bd5',
  },
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
  place: { color: '#fff', fontSize: 28, fontWeight: '600' },
  icon: { fontSize: 72, marginTop: 8 },
  temp: { color: '#fff', fontSize: 96, fontWeight: '200' },
  label: { color: '#fff', fontSize: 22 },
  details: { color: '#e6efff', fontSize: 15, marginTop: 8, textAlign: 'center' },
  card: {
    alignSelf: 'stretch',
    marginTop: 32,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  cardTitle: { color: '#e6efff', fontSize: 14, marginBottom: 8, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  day: { flex: 1, color: '#fff', fontSize: 17 },
  rowIcon: { fontSize: 22, width: 40, textAlign: 'center' },
  range: { color: '#fff', fontSize: 17, width: 90, textAlign: 'right' },
  error: { color: '#fff', fontSize: 18, textAlign: 'center', marginBottom: 16 },
  button: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  buttonText: { color: '#3a7bd5', fontSize: 16, fontWeight: '600' },
});
