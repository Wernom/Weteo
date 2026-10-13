import { createStore } from './store';
import type { City } from './weather';

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
