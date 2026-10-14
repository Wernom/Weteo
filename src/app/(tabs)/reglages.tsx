import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { translateFavorites } from '../../favorites';
import { setLanguage } from '../../i18n';
import {
  Language,
  LANGUAGES,
  PRECIPITATION_UNITS,
  setSetting,
  TEMPERATURE_UNITS,
  useSettings,
  WIND_UNITS,
} from '../../settings';
import { cardStyles } from '../../WeatherView';
import { GRADIENTS } from '../../weather';

export { ErrorBoundary } from '../../ErrorScreen';

// Chaque langue s'écrit dans sa propre langue : on la reconnaît quelle que soit celle de l'app.
const LANGUAGE_NAMES: Record<Language, string> = {
  fr: 'Français',
  en: 'English',
  de: 'Deutsch',
  it: 'Italiano',
  es: 'Español',
};

function chooseLanguage(language: Language) {
  setLanguage(language);
  translateFavorites(language);
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { language, temperature, wind, precipitation } = useSettings();
  const unit = (code: string) => t(`unites.${code}`);
  return (
    <LinearGradient colors={GRADIENTS.jour} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
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
      </ScrollView>
    </LinearGradient>
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
  return (
    <>
      <Text style={[cardStyles.cardTitle, styles.section]} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.card} accessibilityRole="radiogroup">
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
              {checked && <Ionicons name="checkmark" size={22} color="#fff" />}
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingTop: 80, paddingHorizontal: 16, paddingBottom: 40 },
  title: { color: '#fff', fontSize: 28, fontWeight: '600', textAlign: 'center' },
  section: { marginTop: 24 },
  card: { borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  name: { color: '#fff', fontSize: 17 },
});
