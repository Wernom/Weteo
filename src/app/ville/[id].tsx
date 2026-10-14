import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { isFavorite, toggleFavorite, useFavorites } from '../../favorites';
import { usePalette } from '../../theme';
import { City, cityWeatherQuery } from '../../weather';
import { WeatherView } from '../../WeatherView';

export { ErrorBoundary } from '../../ErrorScreen';

// Météo d'une ville choisie dans la recherche : pas de localisation, ses coordonnées suffisent.
export default function CityScreen() {
  const { t } = useTranslation();
  const { id, name, region, country, latitude, longitude } = useLocalSearchParams<{
    id: string;
    name: string;
    region?: string;
    country?: string;
    latitude: string;
    longitude: string;
  }>();
  const city: City = {
    id: Number(id),
    name,
    region: region || null,
    country: country ?? '',
    latitude: Number(latitude),
    longitude: Number(longitude),
  };
  const query = useQuery(cityWeatherQuery(city));
  const favorite = isFavorite(useFavorites(), city.id);
  const { text } = usePalette();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerTransparent: true,
          headerTintColor: text,
          headerBackTitle: t('onglets.villes'),
          headerRight: () => (
            <Pressable
              testID="etoile-ville"
              accessibilityRole="button"
              accessibilityLabel={t(favorite ? 'villes.retirer' : 'villes.ajouter', { name })}
              hitSlop={12}
              onPress={() => toggleFavorite(city)}
            >
              <Ionicons name={favorite ? 'star' : 'star-outline'} size={24} color={text} />
            </Pressable>
          ),
        }}
      />
      <WeatherView query={query} ville={String(city.id)} />
    </>
  );
}
