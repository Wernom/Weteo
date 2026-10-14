import type { ErrorBoundaryProps } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text } from 'react-native';

import { Screen } from './Screen';
import { themedStyles } from './theme';

// Écran commun à tout échec : un message et « Réessayer ». `message` est une clé de traduction ;
// un message qui n'en est pas une (erreur inattendue d'une bibliothèque) s'affiche tel quel.
export function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation();
  const styles = useStyles();
  return (
    <Screen style={styles.container}>
      <Text style={styles.message}>{t(message, { nsSeparator: false })}</Text>
      <RetryButton onPress={onRetry} />
    </Screen>
  );
}

export function RetryButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const styles = useStyles();
  return (
    <Pressable style={styles.button} accessibilityRole="button" onPress={onPress}>
      <Text style={styles.buttonText}>{t('erreurs.reessayer')}</Text>
    </Pressable>
  );
}

// Exporté par chaque écran (Expo Router) : un plantage de rendu reste dans l'écran, les onglets
// et l'en-tête restent utilisables. Le message technique n'est journalisé qu'en développement.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  if (__DEV__) console.error(error);
  return <ErrorScreen message="erreurs.inattendue" onRetry={retry} />;
}

const useStyles = themedStyles((c) => ({
  container: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  message: { color: c.text, fontSize: 18, textAlign: 'center', marginBottom: 16 },
  button: {
    backgroundColor: c.inverse,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  buttonText: { color: c.onInverse, fontSize: 16, fontWeight: '600' },
}));
