import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Pressable } from 'react-native';

import { isFavorite, toggleFavorite, useFavorites } from '../../favorites';
import { City, cityWeatherQuery } from '../../weather';
import { WeatherView } from '../../WeatherView';

export { ErrorBoundary } from '../../ErrorScreen';

// Météo d'une ville choisie dans la recherche : pas de localisation, ses coordonnées suffisent.
export default function CityScreen() {
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

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerTransparent: true,
          headerTintColor: '#fff',
          headerBackTitle: 'Villes',
          headerRight: () => (
            <Pressable
              testID="etoile-ville"
              accessibilityRole="button"
              accessibilityLabel={
                favorite ? `Retirer ${name} des favoris` : `Ajouter ${name} aux favoris`
              }
              hitSlop={12}
              onPress={() => toggleFavorite(city)}
            >
              <Ionicons name={favorite ? 'star' : 'star-outline'} size={24} color="#fff" />
            </Pressable>
          ),
        }}
      />
      <WeatherView query={query} ville={String(city.id)} />
    </>
  );
}
