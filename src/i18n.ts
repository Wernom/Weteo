import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import { Language, readSettings, setSetting } from './settings';

// Textes de l'app dans la langue des réglages. Chaque composant qui affiche du texte appelle
// useTranslation() : c'est ce qui le redessine quand la langue change.
// Initialisé à l'import, par le layout racine (src/app/_layout.tsx) avant tout écran.
const i18n = createInstance();
i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
    de: { translation: de },
    it: { translation: it },
    es: { translation: es },
  },
  lng: readSettings().language,
  fallbackLng: 'fr',
  initAsync: false,
  interpolation: { escapeValue: false },
});

export default i18n;

export function setLanguage(language: Language) {
  setSetting('language', language);
  i18n.changeLanguage(language);
}

// Les heures de l'API sont l'heure locale du lieu (« 2026-10-05T14:00 ») : on les formate en UTC
// pour les afficher telles quelles, sans passer par le fuseau du téléphone.
const utc = (time: string) => new Date(`${time}:00Z`);

// Formateurs créés une fois par langue : en créer un par appel coûte cher (48 heures du bandeau,
// chaque glissé sur la courbe).
function createFormats() {
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(i18n.language, { ...options, timeZone: 'UTC' });
  return {
    hour: format({ hour: 'numeric' }),
    clock: format({ hour: '2-digit', minute: '2-digit' }),
    weekday: format({ weekday: 'long' }),
  };
}
let formats = createFormats();
i18n.on('languageChanged', () => (formats = createFormats()));

// « 3 h » en français, « 3 AM » en anglais. Sans le zéro que certaines langues ajoutent (« 03 h »).
export const formatHour = (time: string) =>
  formats.hour
    .formatToParts(utc(time))
    .map((part) => (part.type === 'hour' ? String(Number(part.value)) : part.value))
    .join('');

// « 07:58 » en français, « 07:58 AM » en anglais.
export const formatClock = (time: string) => formats.clock.format(utc(time));

// « 2026-10-06 » → « Mardi », avec la majuscule même là où la langue n'en met pas.
export function formatWeekday(isoDate: string) {
  const label = formats.weekday.format(utc(`${isoDate}T12:00`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}
