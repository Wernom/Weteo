import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useLayoutEffect } from 'react';
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
import { router, useIsFocused, useNavigation } from 'expo-router';

import { DailyList } from '../../DailyList';
import { HourlyStrip } from '../../HourlyStrip';
import {
  describeWeather,
  fetchForecast,
  GRADIENTS,
  WEATHER_QUERY_KEY,
  WeatherData,
} from '../../weather';

const TEN_MINUTES = 10 * 60 * 1000;

export default function WeatherScreen() {
  const focused = useIsFocused();
  const { data, error, isFetching, isRefetching, refetch } = useQuery({
    queryKey: WEATHER_QUERY_KEY,
    queryFn: loadWeather,
    // Hors geste, au plus un appel toutes les 10 min ; tirer (refetch) passe outre.
    staleTime: TEN_MINUTES,
    // Les onglets restent montés : se réabonner au retour sur l'onglet relance l'appel si périmé,
    // sans purger le cache pendant l'absence.
    subscribed: focused,
    gcTime: Infinity,
    // Une erreur (dont le refus de localisation) ne se relance qu'à la main :
    // sinon la permission serait redemandée à chaque retour sur l'app ou l'onglet.
    retryOnMount: false,
    refetchOnWindowFocus: (query) => query.state.data !== undefined,
  });
  const reload = () => refetch();
  const denied = error?.message === LOCATION_DENIED;
  const now =
    data && describeWeather(data.forecast.current.weatherCode, data.forecast.current.isDay);
  const gradient = GRADIENTS[now?.theme ?? 'jour'];

  // La barre d'onglets prolonge le bas du dégradé.
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ tabBarStyle: { backgroundColor: gradient[1], borderTopWidth: 0 } });
  }, [navigation, gradient]);

  useEffect(() => {
    // Sans position, on ouvre directement la recherche de ville (une seule fois).
    if (denied) router.navigate('/villes');
  }, [denied]);

  if (!data || !now) {
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
  // Le bandeau part de l'heure en cours (« 2026-10-05T14:00 » >= « 2026-10-05T14 »).
  const start = hourly.findIndex((h) => h.time >= current.time.slice(0, 13));

  return (
    <LinearGradient testID="fond-meteo" colors={gradient} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={reload} tintColor="#fff" />
        }
      >
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
          <DailyList days={daily} />
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const LOCATION_DENIED = 'Autorisez la localisation pour voir la météo autour de vous.';

async function loadWeather(): Promise<WeatherData> {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  if (!granted) throw new Error(LOCATION_DENIED);
  const { coords } = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const [forecast, address] = await Promise.all([
    fetchForecast(coords.latitude, coords.longitude),
    Location.reverseGeocodeAsync(coords).catch(() => []),
  ]);
  return { forecast, place: address[0]?.city ?? address[0]?.region ?? null };
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
