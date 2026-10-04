import Ionicons from '@expo/vector-icons/Ionicons';
import { skipToken, useQuery } from '@tanstack/react-query';
import { ComponentProps, useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { router, useIsFocused, useLocalSearchParams, useNavigation } from 'expo-router';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { useFavorites } from '../../favorites';
import {
  City,
  cityQueryKey,
  cityWeatherQuery,
  fetchForecast,
  TEN_MINUTES,
  WEATHER_QUERY_KEY,
  WeatherData,
} from '../../weather';
import { gradientFor, WeatherView } from '../../WeatherView';

export { ErrorBoundary } from '../../ErrorScreen';

// Une page par lieu : ma position, puis les favoris dans l'ordre de la liste. On balaie pour changer.
export default function WeatherScreen() {
  const focused = useIsFocused();
  const query = useQuery({
    queryKey: WEATHER_QUERY_KEY,
    queryFn: loadWeather,
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
  const denied = query.error?.message === LOCATION_DENIED;

  const favorites = useFavorites();
  const pages: (City | null)[] = [null, ...favorites];
  const { width } = useWindowDimensions();
  const list = useRef<FlatList<City | null>>(null);
  const [page, setPage] = useState(0);

  // Toucher un favori dans l'onglet Villes ouvre sa page ici.
  const { page: asked } = useLocalSearchParams<{ page?: string }>();
  const [seen, setSeen] = useState<string>();
  if (asked !== seen) {
    setSeen(asked);
    if (asked !== undefined) setPage(Number(asked));
  }
  useEffect(() => {
    // Effacé pour qu'un nouveau toucher sur le même favori soit vu.
    if (asked !== undefined) router.setParams({ page: undefined });
  }, [asked]);

  // Le favori affiché a pu être supprimé depuis l'onglet Villes : on recule sur le dernier.
  if (page > favorites.length) setPage(favorites.length);

  // Toutes les pages partagent le défilement vertical : on retient celui de la page affichée et,
  // dès qu'on balaie ou saute vers une autre, toutes s'y alignent avant d'apparaître.
  const scrollY = useRef(0);
  const scrollViews = useRef(new Set<ScrollView>());
  const alignPages = () =>
    scrollViews.current.forEach((view) => view.scrollTo({ y: scrollY.current, animated: false }));
  const pageScroll = (index: number) => ({
    scrollRef: (view: ScrollView | null) => {
      if (!view) return;
      scrollViews.current.add(view);
      return () => {
        scrollViews.current.delete(view);
      };
    },
    // Seule la page affichée compte : une page plus courte, alignée, renverrait une hauteur bornée.
    onScroll:
      index === page
        ? (e: NativeSyntheticEvent<NativeScrollEvent>) => {
            scrollY.current = e.nativeEvent.contentOffset.y;
          }
        : undefined,
  });

  // La liste suit la page quand elle ne vient pas d'un balayage (ouverture depuis Villes,
  // suppression) : sinon elle resterait défilée au-delà de la dernière page, toute blanche.
  useEffect(() => {
    alignPages();
    list.current?.scrollToIndex({ index: page, animated: false });
  }, [page]);

  // Fond de la page affichée, lu dans le cache de sa ville.
  const city = favorites[page - 1];
  const cityData = useQuery<WeatherData>({
    queryKey: cityQueryKey(String(city?.id)),
    queryFn: skipToken,
  }).data;
  const gradient = gradientFor(page > 0 ? cityData : query.data);

  // La barre d'onglets prolonge le bas du dégradé.
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ tabBarStyle: { backgroundColor: gradient[1], borderTopWidth: 0 } });
  }, [navigation, gradient]);

  useEffect(() => {
    // Sans position, on ouvre directement la recherche de ville (une seule fois).
    if (denied) router.navigate('/villes');
  }, [denied]);

  return (
    <View style={styles.container}>
      <FlatList
        ref={list}
        testID="pages-meteo"
        data={pages}
        keyExtractor={(item) => (item ? String(item.id) : 'position')}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        onScrollBeginDrag={alignPages}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index }) => (
          <View style={{ width }}>
            {item ? (
              <CityPage city={item} focused={focused} {...pageScroll(index)} />
            ) : (
              <WeatherView query={query} {...pageScroll(index)} />
            )}
          </View>
        )}
      />
      {pages.length > 1 && <PageDots count={pages.length} current={page} />}
    </View>
  );
}

// Même rafraîchissement que ma position : au retour sur l'onglet ou l'app, si périmée.
function CityPage({
  city,
  focused,
  ...scroll
}: { city: City; focused: boolean } & Pick<
  ComponentProps<typeof WeatherView>,
  'scrollRef' | 'onScroll'
>) {
  const query = useQuery({
    ...cityWeatherQuery(city),
    subscribed: focused,
    gcTime: Infinity,
  });
  return <WeatherView query={query} ville={String(city.id)} {...scroll} />;
}

// Flèche pour ma position, puis un point par favori ; celui de la page affichée est plein.
function PageDots({ count, current }: { count: number; current: number }) {
  const color = (i: number) => (i === current ? '#fff' : 'rgba(255,255,255,0.4)');
  return (
    <View
      testID="indicateur"
      style={styles.dots}
      pointerEvents="none"
      accessible
      accessibilityLabel={`Page ${current + 1} sur ${count}`}
    >
      <Ionicons name="navigate" size={10} color={color(0)} />
      {Array.from({ length: count - 1 }, (_, i) => (
        <View key={i} style={[styles.dot, { backgroundColor: color(i + 1) }]} />
      ))}
    </View>
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
  dots: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
