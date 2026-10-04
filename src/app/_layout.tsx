import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState } from 'react-native';

// ponytail: pas de nouvelle tentative auto, délai et retries réseau arrivent avec US 1.12.
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

// L'app revient au premier plan → react-query relance les requêtes périmées.
focusManager.setEventListener((setFocused) => {
  const sub = AppState.addEventListener('change', (state) => setFocused(state === 'active'));
  return () => sub.remove();
});

// Les écrans de détail s'empilent au-dessus des onglets.
export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
