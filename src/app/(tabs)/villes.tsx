import Ionicons from '@expo/vector-icons/Ionicons';
import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ComponentProps, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { RetryButton } from '../../ErrorScreen';
import { isFavorite, moveFavorite, toggleFavorite, useFavorites } from '../../favorites';
import {
  City,
  cityWeatherQuery,
  describeWeather,
  GRADIENTS,
  searchCities,
  WEATHER_QUERY_KEY,
  WeatherData,
} from '../../weather';

export { ErrorBoundary } from '../../ErrorScreen';

export default function CitiesScreen() {
  const [text, setText] = useState('');
  const [term, setTerm] = useState('');
  const favorites = useFavorites();
  // On attend une pause dans la frappe avant d'interroger l'API.
  useEffect(() => {
    const timer = setTimeout(() => setTerm(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text]);

  // Avec une seule lettre, l'API ne renvoie jamais rien : inutile de l'appeler.
  const enabled = term.length >= 2;
  const { data, error, isFetching, refetch } = useQuery({
    queryKey: ['villes', term],
    queryFn: () => searchCities(term),
    enabled,
    placeholderData: keepPreviousData,
    // Les villes ne changent pas : une recherche encore en cache n'est pas relancée.
    staleTime: Infinity,
  });

  let message: string | null = null;
  if (!enabled) message = 'Tapez au moins 2 lettres.';
  else if (error) message = error.message;
  else if (data?.length === 0)
    message = `Aucune ville trouvée pour « ${term} ». Vérifiez l'orthographe.`;

  return (
    <LinearGradient colors={GRADIENTS.jour} style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Rechercher une ville
      </Text>
      <TextInput
        testID="recherche-ville"
        accessibilityLabel="Nom de la ville"
        placeholder="Paris, Lyon, Montréal…"
        placeholderTextColor="#c4d6f5"
        style={styles.input}
        value={text}
        onChangeText={setText}
        autoCorrect={false}
        returnKeyType="search"
      />
      {isFetching && <ActivityIndicator color="#fff" style={styles.spinner} />}
      {term === '' ? (
        <FlatList
          data={favorites}
          keyExtractor={(city) => String(city.id)}
          ListHeaderComponent={MyPositionRow}
          renderItem={({ item, index }) => (
            <FavoriteRow city={item} index={index} last={index === favorites.length - 1} />
          )}
        />
      ) : message ? (
        <View style={styles.center}>
          <Text style={styles.message}>{message}</Text>
          {error && <RetryButton onPress={() => refetch()} />}
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(city) => String(city.id)}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => (
            <CityRow city={item} index={index} favorite={isFavorite(favorites, item.id)} />
          )}
        />
      )}
    </LinearGradient>
  );
}

const where = (city: City) => [city.region, city.country].filter(Boolean).join(', ');

function openCity(city: City) {
  router.push({
    pathname: '/ville/[id]',
    params: {
      id: String(city.id),
      name: city.name,
      region: city.region ?? '',
      country: city.country,
      latitude: String(city.latitude),
      longitude: String(city.longitude),
    },
  });
}

// Page de l'onglet Météo : 0 pour ma position, puis les favoris dans l'ordre.
const openPage = (page: number) =>
  router.navigate({ pathname: '/', params: { page: String(page) } });

function CityRow({ city, index, favorite }: { city: City; index: number; favorite: boolean }) {
  return (
    <View style={styles.row}>
      <Pressable
        testID={`ville-${index}`}
        style={styles.grow}
        accessibilityRole="button"
        accessibilityLabel={`${city.name}, ${where(city)}`}
        onPress={() => openCity(city)}
      >
        <Text style={styles.name}>{city.name}</Text>
        <Text style={styles.where}>{where(city)}</Text>
      </Pressable>
      <IconButton
        testID={`etoile-${index}`}
        icon={favorite ? 'star' : 'star-outline'}
        label={favorite ? `Retirer ${city.name} des favoris` : `Ajouter ${city.name} aux favoris`}
        onPress={() => toggleFavorite(city)}
      />
    </View>
  );
}

// Toujours en tête des villes ; reprend le lieu et la météo déjà chargés par l'onglet Météo,
// sans redemander la localisation.
function MyPositionRow() {
  const { data } = useQuery<WeatherData>({ queryKey: WEATHER_QUERY_KEY, queryFn: skipToken });
  const title = data?.place ? `Ma position · ${data.place}` : 'Ma position';
  return (
    <Pressable
      testID="ma-position"
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => openPage(0)}
    >
      <Ionicons name="navigate" size={18} color="#fff" style={styles.pin} />
      <Text style={[styles.name, styles.grow]}>{title}</Text>
      <WeatherSummary data={data} />
    </Pressable>
  );
}

function FavoriteRow({ city, index, last }: { city: City; index: number; last: boolean }) {
  const { data } = useQuery(cityWeatherQuery(city));
  return (
    <View style={styles.row}>
      <Pressable
        testID={`favori-${index}`}
        style={styles.inner}
        accessibilityRole="button"
        accessibilityLabel={`${city.name}, ${where(city)}`}
        onPress={() => openPage(index + 1)}
      >
        <View style={styles.grow}>
          <Text style={styles.name}>{city.name}</Text>
          <Text style={styles.where}>{where(city)}</Text>
        </View>
        <WeatherSummary data={data} />
      </Pressable>
      <IconButton
        icon="chevron-up"
        label={`Monter ${city.name}`}
        disabled={index === 0}
        onPress={() => moveFavorite(city.id, -1)}
      />
      <IconButton
        icon="chevron-down"
        label={`Descendre ${city.name}`}
        disabled={last}
        onPress={() => moveFavorite(city.id, 1)}
      />
      <IconButton
        icon="close"
        label={`Supprimer ${city.name}`}
        onPress={() => toggleFavorite(city)}
      />
    </View>
  );
}

// Rien tant que la météo n'est pas là (chargement, erreur, localisation refusée).
function WeatherSummary({ data }: { data: WeatherData | undefined }) {
  if (!data) return null;
  const { weatherCode, isDay, temperature } = data.forecast.current;
  return (
    <View style={styles.summary}>
      <Ionicons name={describeWeather(weatherCode, isDay).icon} size={22} color="#fff" />
      <Text style={styles.temperature}>{Math.round(temperature)}°</Text>
    </View>
  );
}

function IconButton({
  icon,
  label,
  onPress,
  disabled,
  testID,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      style={[styles.iconButton, disabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
    >
      <Ionicons name={icon} size={22} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 80, paddingHorizontal: 16 },
  title: { color: '#fff', fontSize: 28, fontWeight: '600', textAlign: 'center' },
  input: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
    color: '#fff',
    fontSize: 17,
  },
  spinner: { marginTop: 16 },
  center: { alignItems: 'center', marginTop: 24, gap: 16 },
  message: { color: '#e6efff', fontSize: 17, textAlign: 'center' },
  row: {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Ligne dans une ligne : pas de deuxième fond ni de marge.
  inner: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
  pin: { marginRight: 8 },
  summary: { flexDirection: 'row', alignItems: 'center', marginLeft: 8, gap: 4 },
  temperature: { color: '#fff', fontSize: 18, fontWeight: '600' },
  iconButton: { padding: 6, marginLeft: 4 },
  disabled: { opacity: 0.3 },
  name: { color: '#fff', fontSize: 18, fontWeight: '600' },
  where: { color: '#e6efff', fontSize: 15, marginTop: 2 },
});
