import { createStore } from './store';

// Réglages de l'app, conservés sur le téléphone. Chaque réglage ajoute sa clé ici,
// avec sa valeur par défaut dans DEFAULTS.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type Settings = {};

const DEFAULTS: Settings = {};

// Les valeurs par défaut complètent ce qui est stocké : un réglage ajouté dans une
// nouvelle version a sa valeur par défaut chez un utilisateur déjà installé.
const store = createStore<Settings>('reglages', (value) => ({
  ...DEFAULTS,
  ...(value ? JSON.parse(value) : {}),
}));

export const useSettings = store.use;

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  store.write({ ...store.read(), [key]: value });
}
