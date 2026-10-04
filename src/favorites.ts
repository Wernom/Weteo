import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

import type { City } from './weather';

// Villes favorites, dans l'ordre choisi, stockées sur le téléphone (SQLite).
// « Ma position » n'y figure pas : l'écran l'affiche toujours en premier.
const KEY = 'favoris';
const listeners = new Set<() => void>();
let raw: string | null = null;
let cached: City[] = [];

// Le stockage reste la seule source de vérité ; on ne reparse que s'il a changé.
function read(): City[] {
  const value = Storage.getItemSync(KEY);
  if (value !== raw) {
    raw = value;
    cached = value ? JSON.parse(value) : [];
  }
  return cached;
}

function write(favorites: City[]) {
  Storage.setItemSync(KEY, JSON.stringify(favorites));
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useFavorites(): City[] {
  return useSyncExternalStore(subscribe, read);
}

export const isFavorite = (favorites: City[], id: number) => favorites.some((f) => f.id === id);

export function toggleFavorite(city: City) {
  const favorites = read();
  write(
    isFavorite(favorites, city.id)
      ? favorites.filter((f) => f.id !== city.id)
      : [...favorites, city],
  );
}

// Échange la ville avec sa voisine du dessus (-1) ou du dessous (1).
export function moveFavorite(id: number, delta: -1 | 1) {
  const favorites = [...read()];
  const from = favorites.findIndex((f) => f.id === id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= favorites.length) return;
  [favorites[from], favorites[to]] = [favorites[to], favorites[from]];
  write(favorites);
}
