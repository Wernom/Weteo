import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { translateFavorites } from '../../favorites';
import { setLanguage } from '../../i18n';
import { Language, LANGUAGES, useSettings } from '../../settings';
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
  const { language } = useSettings();
  return (
    <LinearGradient colors={GRADIENTS.jour} style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        {t('reglages.titre')}
      </Text>
      <Text style={[cardStyles.cardTitle, styles.section]} accessibilityRole="header">
        {t('reglages.langue')}
      </Text>
      <View style={styles.card} accessibilityRole="radiogroup">
        {LANGUAGES.map((code) => {
          const checked = code === language;
          return (
            <Pressable
              key={code}
              testID={`langue-${code}`}
              style={styles.row}
              accessibilityRole="radio"
              accessibilityState={{ checked }}
              onPress={() => chooseLanguage(code)}
            >
              <Text style={styles.name}>{LANGUAGE_NAMES[code]}</Text>
              {checked && <Ionicons name="checkmark" size={22} color="#fff" />}
            </Pressable>
          );
        })}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 80, paddingHorizontal: 16 },
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
