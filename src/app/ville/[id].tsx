import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';

import { cityQueryKey, fetchForecast } from '../../weather';
import { WeatherView } from '../../WeatherView';

// Météo d'une ville choisie dans la recherche : pas de localisation, ses coordonnées suffisent.
export default function CityScreen() {
  const { id, name, latitude, longitude } = useLocalSearchParams<{
    id: string;
    name: string;
    latitude: string;
    longitude: string;
  }>();
  const query = useQuery({
    queryKey: cityQueryKey(id),
    queryFn: async () => ({
      forecast: await fetchForecast(Number(latitude), Number(longitude)),
      place: name,
    }),
    // ponytail: rafraîchie seulement en tirant ; le rafraîchissement auto arrive avec US 1.11.
    staleTime: 10 * 60 * 1000,
  });

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerTransparent: true,
          headerTintColor: '#fff',
          headerBackTitle: 'Villes',
        }}
      />
      <WeatherView query={query} ville={id} />
    </>
  );
}
