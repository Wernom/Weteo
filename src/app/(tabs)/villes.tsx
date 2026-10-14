import Ionicons from '@expo/vector-icons/Ionicons';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ComponentProps, ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { gradientFor } from '../../WeatherView';
import { isFavorite, moveFavorite, toggleFavorite, useFavorites } from '../../favorites';
import { useSettings } from '../../settings';
import { useUnits } from '../../units';
import {
  City,
  cityWeatherQuery,
  describeWeather,
  GRADIENTS,
  iconColor,
  loadWeather,
  searchCities,
  WEATHER_QUERY_KEY,
  WeatherData,
} from '../../weather';

export { ErrorBoundary } from '../../ErrorScreen';

export default function CitiesScreen() {
  const { t } = useTranslation();
  const { language } = useSettings();
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
    // Une recherche faite dans une autre langue n'est pas resservie.
    queryKey: ['villes', language, term],
    queryFn: () => searchCities(term, language),
    enabled,
    placeholderData: keepPreviousData,
    // Les villes ne changent pas : une recherche encore en cache n'est pas relancée.
    staleTime: Infinity,
  });

  let message: string | null = null;
  if (!enabled) message = t('villes.deuxLettres');
  else if (error) message = t(error.message);
  else if (data?.length === 0) message = t('villes.aucune', { term });

  return (
    <LinearGradient colors={GRADIENTS.jour} style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        {t('villes.titre')}
      </Text>
      <TextInput
        testID="recherche-ville"
        accessibilityLabel={t('villes.champ')}
        placeholder={t('villes.exemple')}
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
  const { t } = useTranslation();
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
        label={t(favorite ? 'villes.retirer' : 'villes.ajouter', { name: city.name })}
        onPress={() => toggleFavorite(city)}
      />
    </View>
  );
}

// Toujours en tête des villes ; reprend le lieu et la météo déjà chargés par l'onglet Météo,
// sans redemander la localisation.
function MyPositionRow() {
  const { t } = useTranslation();
  // Pas de skipToken : il remplacerait loadWeather pour un nouvel essai en cours (voir l'onglet Météo).
  const { data } = useQuery<WeatherData>({
    queryKey: WEATHER_QUERY_KEY,
    queryFn: loadWeather,
    enabled: false,
  });
  const title = data?.place
    ? t('meteo.maPositionLieu', { place: data.place })
    : t('meteo.maPosition');
  return (
    <WeatherCard data={data}>
      <Pressable
        testID="ma-position"
        style={styles.inner}
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={() => openPage(0)}
      >
        <Ionicons name="navigate" size={18} color="#fff" style={styles.pin} />
        <Text style={[styles.name, styles.grow]}>{title}</Text>
        <WeatherSummary data={data} />
      </Pressable>
    </WeatherCard>
  );
}

function FavoriteRow({ city, index, last }: { city: City; index: number; last: boolean }) {
  const { t } = useTranslation();
  const { data } = useQuery(cityWeatherQuery(city));
  return (
    <WeatherCard data={data}>
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
        label={t('villes.monter', { name: city.name })}
        disabled={index === 0}
        onPress={() => moveFavorite(city.id, -1)}
      />
      <IconButton
        icon="chevron-down"
        label={t('villes.descendre', { name: city.name })}
        disabled={last}
        onPress={() => moveFavorite(city.id, 1)}
      />
      <IconButton
        icon="close"
        label={t('villes.supprimer', { name: city.name })}
        onPress={() => toggleFavorite(city)}
      />
    </WeatherCard>
  );
}

// Ligne aux couleurs de la météo de son lieu ; translucide tant qu'elle n'est pas chargée.
function WeatherCard({ data, children }: { data: WeatherData | undefined; children: ReactNode }) {
  return (
    <LinearGradient
      colors={data ? gradientFor(data) : TRANSLUCENT}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.row, styles.card]}
    >
      {children}
    </LinearGradient>
  );
}
const TRANSLUCENT = ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.15)'] as const;

// Rien tant que la météo n'est pas là (chargement, erreur, localisation refusée).
function WeatherSummary({ data }: { data: WeatherData | undefined }) {
  const units = useUnits();
  if (!data) return null;
  const { weatherCode, isDay, temperature } = data.forecast.current;
  const { icon } = describeWeather(weatherCode, isDay);
  return (
    <View style={styles.summary}>
      <Ionicons name={icon} size={26} color={iconColor(icon)} />
      <Text style={styles.temperature}>{units.temp(temperature)}°</Text>
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
  temperature: { color: '#fff', fontSize: 26, fontWeight: '300' },
  card: {
    paddingVertical: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  iconButton: { padding: 6, marginLeft: 4 },
  disabled: { opacity: 0.3 },
  name: { color: '#fff', fontSize: 18, fontWeight: '600' },
  where: { color: '#e6efff', fontSize: 15, marginTop: 2 },
});
