import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { translateFavorites } from '../../favorites';
import { setLanguage } from '../../i18n';
import {
  Language,
  LANGUAGES,
  PRECIPITATION_UNITS,
  readSettings,
  setSetting,
  TEMPERATURE_UNITS,
  THEMES,
  useSettings,
  WIND_UNITS,
} from '../../settings';
import { Screen, useScreenStyles } from '../../Screen';
import { font, space, themedStyles, usePalette } from '../../theme';

export { ErrorBoundary } from '../../ErrorScreen';

// Chaque langue s'écrit dans sa propre langue : on la reconnaît quelle que soit celle de l'app.
const LANGUAGE_NAMES: Record<Language, string> = {
  fr: 'Français',
  en: 'English',
  de: 'Deutsch',
  it: 'Italiano',
  es: 'Español',
};

// Retoucher la langue affichée ne relance pas la traduction des favoris (un appel par ville).
function chooseLanguage(language: Language) {
  if (language === readSettings().language) return;
  setLanguage(language);
  translateFavorites(language);
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { language, temperature, wind, precipitation, theme } = useSettings();
  const styles = useStyles();
  const shared = useScreenStyles();
  const { top } = useSafeAreaInsets();
  const unit = (code: string) => t(`unites.${code}`);
  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: top + space.xxxl }]}>
        <Text style={shared.title} accessibilityRole="header">
          {t('reglages.titre')}
        </Text>
        <Choices
          title={t('reglages.langue')}
          options={LANGUAGES}
          value={language}
          label={(code) => LANGUAGE_NAMES[code]}
          onChange={chooseLanguage}
          testID="langue"
        />
        <Choices
          title={t('reglages.temperature')}
          options={TEMPERATURE_UNITS}
          value={temperature}
          label={unit}
          onChange={(value) => setSetting('temperature', value)}
          testID="unite"
        />
        <Choices
          title={t('reglages.vent')}
          options={WIND_UNITS}
          value={wind}
          label={unit}
          onChange={(value) => setSetting('wind', value)}
          testID="unite"
        />
        <Choices
          title={t('reglages.precipitations')}
          options={PRECIPITATION_UNITS}
          value={precipitation}
          label={unit}
          onChange={(value) => setSetting('precipitation', value)}
          testID="unite"
        />
        <Choices
          title={t('reglages.theme')}
          options={THEMES}
          value={theme}
          label={(code) => t(`themes.${code}`)}
          onChange={(value) => setSetting('theme', value)}
          testID="theme"
        />
      </ScrollView>
    </Screen>
  );
}

// Une section de choix exclusifs ; chaque ligne a le testID « <testID>-<option> ».
function Choices<T extends string>({
  title,
  options,
  value,
  label,
  onChange,
  testID,
}: {
  title: string;
  options: readonly T[];
  value: T;
  label: (option: T) => string;
  onChange: (option: T) => void;
  testID: string;
}) {
  const c = usePalette();
  const styles = useStyles();
  const shared = useScreenStyles();
  return (
    <>
      <Text style={[shared.cardTitle, styles.section]} accessibilityRole="header">
        {title}
      </Text>
      <View style={[shared.card, styles.card]} accessibilityRole="radiogroup">
        {options.map((option) => {
          const checked = option === value;
          return (
            <Pressable
              key={option}
              testID={`${testID}-${option}`}
              style={styles.row}
              accessibilityRole="radio"
              accessibilityState={{ checked }}
              onPress={() => onChange(option)}
            >
              <Text style={styles.name}>{label(option)}</Text>
              {checked && <Ionicons name="checkmark" size={22} color={c.text} />}
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

const useStyles = themedStyles((c) => ({
  content: { paddingHorizontal: space.l, paddingBottom: space.xxxxl },
  section: { marginTop: space.xxl },
  // Carte commune, collée à son titre ; les lignes portent la marge intérieure.
  card: { marginTop: 0, padding: 0, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: space.l,
    paddingVertical: space.m,
  },
  name: { color: c.text, fontSize: font.size.body },
}));
