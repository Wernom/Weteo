import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text } from 'react-native';

import { GRADIENTS } from '../../weather';

export { ErrorBoundary } from '../../ErrorScreen';

export default function SettingsScreen() {
  return (
    <LinearGradient colors={GRADIENTS.jour} style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Réglages
      </Text>
      <Text style={styles.message}>Aucun réglage pour le moment.</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 80, paddingHorizontal: 16 },
  title: { color: '#fff', fontSize: 28, fontWeight: '600', textAlign: 'center' },
  message: { marginTop: 24, color: '#e6efff', fontSize: 17, textAlign: 'center' },
});
