import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { City, GRADIENTS, searchCities } from '../../weather';

export default function CitiesScreen() {
  const [text, setText] = useState('');
  const [term, setTerm] = useState('');
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
      {message ? (
        <View style={styles.center}>
          <Text style={styles.message}>{message}</Text>
          {error && (
            <Pressable style={styles.button} onPress={() => refetch()}>
              <Text style={styles.buttonText}>Réessayer</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(city) => String(city.id)}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => <CityRow city={item} index={index} />}
        />
      )}
    </LinearGradient>
  );
}

function CityRow({ city, index }: { city: City; index: number }) {
  const where = [city.region, city.country].filter(Boolean).join(', ');
  return (
    <Pressable
      testID={`ville-${index}`}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={`${city.name}, ${where}`}
      onPress={() =>
        router.push({
          pathname: '/ville/[id]',
          params: {
            id: String(city.id),
            name: city.name,
            latitude: String(city.latitude),
            longitude: String(city.longitude),
          },
        })
      }
    >
      <Text style={styles.name}>{city.name}</Text>
      <Text style={styles.where}>{where}</Text>
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
  center: { alignItems: 'center', marginTop: 24 },
  message: { color: '#e6efff', fontSize: 17, textAlign: 'center' },
  row: {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  name: { color: '#fff', fontSize: 18, fontWeight: '600' },
  where: { color: '#e6efff', fontSize: 15, marginTop: 2 },
  button: {
    marginTop: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  buttonText: { color: GRADIENTS.jour[1], fontSize: 16, fontWeight: '600' },
});
