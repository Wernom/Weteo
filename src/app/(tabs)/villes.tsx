import Ionicons from '@expo/vector-icons/Ionicons';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RetryButton } from '../../ErrorScreen';
import { isFavorite, moveFavorite, toggleFavorite, useFavorites } from '../../favorites';
import { useSettings } from '../../settings';
import { Screen, useScreenStyles } from '../../Screen';
import { font, gradientFor, iconColor, radius, space, themedStyles, usePalette } from '../../theme';
import { useUnits } from '../../units';
import {
  City,
  cityWeatherQuery,
  describeWeather,
  IconName,
  positionWeatherQuery,
  searchCities,
  WeatherData,
} from '../../weather';

export { ErrorBoundary } from '../../ErrorScreen';

export default function CitiesScreen() {
  const { t } = useTranslation();
  const { language } = useSettings();
  const c = usePalette();
  const styles = useStyles();
  const shared = useScreenStyles();
  const { top } = useSafeAreaInsets();
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
    <Screen style={[styles.container, { paddingTop: top + space.xxxl }]}>
      <Text style={shared.title} accessibilityRole="header">
        {t('villes.titre')}
      </Text>
      <TextInput
        testID="recherche-ville"
        accessibilityLabel={t('villes.champ')}
        placeholder={t('villes.exemple')}
        placeholderTextColor={c.secondary}
        style={styles.input}
        value={text}
        onChangeText={setText}
        autoCorrect={false}
        returnKeyType="search"
      />
      {isFetching && <ActivityIndicator color={c.text} style={styles.spinner} />}
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
    </Screen>
  );
}

const where = (city: City) => [city.region, city.country].filter(Boolean).join(', ');

function openCity(city: City) {
  router.push({
    pathname: '/ville/[id]',
    params: { id: String(city.id), city: JSON.stringify(city) },
  });
}

// Page de l'onglet Météo : 0 pour ma position, puis les favoris dans l'ordre.
const openPage = (page: number) =>
  router.navigate({ pathname: '/', params: { page: String(page) } });

function CityRow({ city, index, favorite }: { city: City; index: number; favorite: boolean }) {
  const { t } = useTranslation();
  const styles = useStyles();
  const shared = useScreenStyles();
  return (
    <View style={[shared.card, styles.row]}>
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
  const c = usePalette();
  const styles = useStyles();
  const { data } = useQuery({ ...positionWeatherQuery, enabled: false });
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
        <Ionicons name="navigate" size={18} color={c.text} style={styles.pin} />
        <Text style={[styles.name, styles.grow]}>{title}</Text>
        <WeatherSummary data={data} />
      </Pressable>
    </WeatherCard>
  );
}

function FavoriteRow({ city, index, last }: { city: City; index: number; last: boolean }) {
  const { t } = useTranslation();
  const styles = useStyles();
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
  const c = usePalette();
  const styles = useStyles();
  const shared = useScreenStyles();
  return (
    <LinearGradient
      colors={data ? gradientFor(c, data) : [c.surface, c.surface]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[shared.card, styles.row, styles.card]}
    >
      {children}
    </LinearGradient>
  );
}

// Rien tant que la météo n'est pas là (chargement, erreur, localisation refusée).
function WeatherSummary({ data }: { data: WeatherData | undefined }) {
  const units = useUnits();
  const c = usePalette();
  const styles = useStyles();
  if (!data) return null;
  const { weatherCode, isDay, temperature } = data.forecast.current;
  const { icon } = describeWeather(weatherCode, isDay);
  return (
    <View style={styles.summary}>
      <Ionicons name={icon} size={26} color={iconColor(c, icon)} />
      <Text style={styles.temperature}>{units.temp(temperature)}</Text>
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
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  const c = usePalette();
  const styles = useStyles();
  return (
    <Pressable
      testID={testID}
      style={[styles.iconButton, disabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      // Icône 22 + marge 2 × 6 + 2 × 7 : cible de 48 dp.
      hitSlop={7}
      onPress={onPress}
    >
      <Ionicons name={icon} size={22} color={c.text} />
    </Pressable>
  );
}

const useStyles = themedStyles((c) => ({
  container: { paddingHorizontal: space.l },
  input: {
    marginTop: space.l,
    paddingHorizontal: space.l,
    paddingVertical: space.m,
    borderRadius: radius.pill,
    backgroundColor: c.surface,
    color: c.text,
    fontSize: font.size.body,
  },
  spinner: { marginTop: space.l },
  center: { alignItems: 'center', marginTop: space.xxl, gap: space.l },
  message: { color: c.secondary, fontSize: font.size.body, textAlign: 'center' },
  // Carte commune, plus serrée dans une liste.
  row: { marginTop: space.m, flexDirection: 'row', alignItems: 'center' },
  // Ligne dans une ligne : pas de deuxième fond ni de marge.
  inner: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
  pin: { marginRight: space.s },
  summary: { flexDirection: 'row', alignItems: 'center', marginLeft: space.s, gap: space.xs },
  temperature: { color: c.text, fontSize: font.size.title2, fontWeight: font.weight.light },
  card: { paddingVertical: space.xl },
  iconButton: { padding: space.xs + space.xxs, marginLeft: space.xs },
  disabled: { opacity: 0.3 },
  name: { color: c.text, fontSize: font.size.headline, fontWeight: font.weight.semibold },
  where: { color: c.secondary, fontSize: font.size.subhead, marginTop: space.xxs },
}));
