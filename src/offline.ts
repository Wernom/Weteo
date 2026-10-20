import { dehydrate, hashKey, hydrate, Query, QueryClient } from '@tanstack/react-query';
import Storage from 'expo-sqlite/kv-store';

import { readFavorites } from './favorites';
import { cityQueryKey, WEATHER_QUERY_KEY } from './weather';

const KEY = 'cache-meteo';

// Ma position et les favoris actuels seulement : un favori retiré sort du stockage au prochain
// enregistrement, les recherches de villes n'y entrent pas.
function kept(query: Query) {
  const keys = [WEATHER_QUERY_KEY, ...readFavorites().map((f) => cityQueryKey(String(f.id)))];
  return query.state.status === 'success' && keys.some((key) => hashKey(key) === query.queryHash);
}

// Dernière météo de chaque lieu gardée sur le téléphone, pour l'afficher sans réseau.
export function persistWeather(client: QueryClient) {
  // Lecture synchrone : le cache est là avant le premier écran, avec l'heure de son chargement.
  // gcTime infini : une page pas encore montée (favori loin dans la liste) n'est pas purgée.
  try {
    const stored = Storage.getItemSync(KEY);
    if (stored) {
      hydrate(client, JSON.parse(stored), { defaultOptions: { queries: { gcTime: Infinity } } });
    }
  } catch {
    // Cache illisible : on repart sans, comme au premier lancement.
  }
  client.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated' || event.action.type !== 'success') return;
    Storage.setItemSync(KEY, JSON.stringify(dehydrate(client, { shouldDehydrateQuery: kept })));
  });
}
