import { Language, readSettings } from './settings';
import { createStore } from './store';
import { City, getCity } from './weather';

// Villes favorites, dans l'ordre choisi, stockées sur le téléphone.
// « Ma position » n'y figure pas : l'écran l'affiche toujours en premier.
const store = createStore<City[]>('favoris', (value) => (value ? JSON.parse(value) : []));

export const useFavorites = store.use;

export const isFavorite = (favorites: City[], id: number) => favorites.some((f) => f.id === id);

export function toggleFavorite(city: City) {
  const favorites = store.read();
  store.write(
    isFavorite(favorites, city.id)
      ? favorites.filter((f) => f.id !== city.id)
      : [...favorites, city],
  );
}

// Échange la ville avec sa voisine du dessus (-1) ou du dessous (1).
export function moveFavorite(id: number, delta: -1 | 1) {
  const favorites = [...store.read()];
  const from = favorites.findIndex((f) => f.id === id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= favorites.length) return;
  [favorites[from], favorites[to]] = [favorites[to], favorites[from]];
  store.write(favorites);
}

// Noms des favoris dans `language`, ville par ville. Une ville que l'API ne renvoie pas (hors ligne)
// garde son nom. On relit les favoris après les appels : un ajout ou une suppression faits
// entre-temps sont conservés.
export async function translateFavorites(language: Language) {
  const results = await Promise.allSettled(store.read().map((f) => getCity(f.id, language)));
  const translated = new Map(
    results.flatMap((r) => (r.status === 'fulfilled' ? [[r.value.id, r.value] as const] : [])),
  );
  // Une langue choisie entre-temps l'emporte, même si ses réponses sont arrivées avant.
  if (translated.size === 0 || readSettings().language !== language) return;
  store.write(store.read().map((f) => translated.get(f.id) ?? f));
}
