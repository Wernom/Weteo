import type { ErrorBoundaryProps } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text } from 'react-native';

import { GRADIENTS } from './weather';

// Écran commun à tout échec : un message et « Réessayer ».
export function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <LinearGradient colors={GRADIENTS.jour} style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      <RetryButton onPress={onRetry} />
    </LinearGradient>
  );
}

export function RetryButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.button} accessibilityRole="button" onPress={onPress}>
      <Text style={styles.buttonText}>Réessayer</Text>
    </Pressable>
  );
}

// Exporté par chaque écran (Expo Router) : un plantage de rendu reste dans l'écran, les onglets
// et l'en-tête restent utilisables. Le message technique n'est journalisé qu'en développement.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  if (__DEV__) console.error(error);
  return <ErrorScreen message="Une erreur inattendue est survenue." onRetry={retry} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  message: { color: '#fff', fontSize: 18, textAlign: 'center', marginBottom: 16 },
  button: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  buttonText: { color: GRADIENTS.jour[1], fontSize: 16, fontWeight: '600' },
});
