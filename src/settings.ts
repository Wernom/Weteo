import { getLocales } from 'expo-localization';

import { createStore } from './store';

export const LANGUAGES = ['fr', 'en', 'de', 'it', 'es'] as const;
export type Language = (typeof LANGUAGES)[number];

// Langue du téléphone si l'app la propose, sinon le français.
function phoneLanguage(): Language {
  const code = getLocales()[0]?.languageCode;
  return LANGUAGES.find((l) => l === code) ?? 'fr';
}

// Réglages de l'app, conservés sur le téléphone. Chaque réglage ajoute sa clé ici,
// avec sa valeur par défaut dans DEFAULTS.
export type Settings = { language: Language };

// Tant que l'utilisateur n'a pas choisi, la langue suit celle du téléphone.
const defaults = (): Settings => ({ language: phoneLanguage() });

// Les valeurs par défaut complètent ce qui est stocké : un réglage ajouté dans une
// nouvelle version a sa valeur par défaut chez un utilisateur déjà installé.
const store = createStore<Settings>('reglages', (value) => ({
  ...defaults(),
  ...(value ? JSON.parse(value) : {}),
}));

export const useSettings = store.use;
export const readSettings = store.read;

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  store.write({ ...store.read(), [key]: value });
}
