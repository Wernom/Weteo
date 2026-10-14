import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

// Valeur stockée sur le téléphone (SQLite), partagée par tous les écrans qui l'utilisent.
// `parse` reçoit la valeur stockée, déjà décodée, ou `undefined` s'il n'y en a pas.
export function createStore<T>(key: string, parse: (stored: T | undefined) => T) {
  const listeners = new Set<() => void>();
  let raw: string | null | undefined;
  let cached: T;

  // Le stockage reste la seule source de vérité ; on ne reparse que s'il a changé.
  function read(): T {
    const value = Storage.getItemSync(key);
    if (value !== raw) {
      raw = value;
      // Valeur illisible : on repart du défaut plutôt que de bloquer l'écran à chaque lecture.
      try {
        cached = parse(value === null ? undefined : JSON.parse(value));
      } catch {
        cached = parse(undefined);
      }
    }
    return cached;
  }

  function write(value: T) {
    Storage.setItemSync(key, JSON.stringify(value));
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  const use = () => useSyncExternalStore(subscribe, read);

  return { read, write, use };
}
