import { useQuery } from '@tanstack/react-query';
import { useEffect, useLayoutEffect } from 'react';
import * as Location from 'expo-location';
import { router, useIsFocused, useNavigation } from 'expo-router';

import { fetchForecast, WEATHER_QUERY_KEY, WeatherData } from '../../weather';
import { gradientFor, WeatherView } from '../../WeatherView';

const TEN_MINUTES = 10 * 60 * 1000;

export default function WeatherScreen() {
  const focused = useIsFocused();
  const query = useQuery({
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
  const denied = query.error?.message === LOCATION_DENIED;
  const gradient = gradientFor(query.data);

  // La barre d'onglets prolonge le bas du dégradé.
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ tabBarStyle: { backgroundColor: gradient[1], borderTopWidth: 0 } });
  }, [navigation, gradient]);

  useEffect(() => {
    // Sans position, on ouvre directement la recherche de ville (une seule fois).
    if (denied) router.navigate('/villes');
  }, [denied]);

  return <WeatherView query={query} />;
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
