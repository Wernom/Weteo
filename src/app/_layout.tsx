// Textes prêts avant le premier écran, y compris celui d'erreur.
import '../i18n';

import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState } from 'react-native';

import { persistWeather } from '../offline';
import { useScheme } from '../theme';
import { shouldRetry } from '../weather';

export { ErrorBoundary } from '../ErrorScreen';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: shouldRetry } } });
persistWeather(queryClient);

// Erreurs hors rendu (gestes, minuteries) : en développement LogBox les journalise,
// en production l'app ne plante pas. Rien n'est envoyé à un service externe.
const defaultHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  if (__DEV__) defaultHandler(error, isFatal);
});

// L'app revient au premier plan → react-query relance les requêtes périmées.
focusManager.setEventListener((setFocused) => {
  const sub = AppState.addEventListener('change', (state) => setFocused(state === 'active'));
  return () => sub.remove();
});

// Les écrans de détail s'empilent au-dessus des onglets.
export default function RootLayout() {
  // Texte de la barre d'état contrasté sur le fond : clair en thème sombre, et inversement.
  const statusBar = useScheme() === 'dark' ? 'light' : 'dark';
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style={statusBar} />
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
