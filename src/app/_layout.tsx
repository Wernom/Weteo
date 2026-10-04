import Ionicons from '@expo/vector-icons/Ionicons';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Tabs } from 'expo-router/js-tabs';
import { StatusBar } from 'expo-status-bar';
import { AppState } from 'react-native';

// ponytail: pas de nouvelle tentative auto, délai et retries réseau arrivent avec US 1.12.
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

// L'app revient au premier plan → react-query relance les requêtes périmées.
focusManager.setEventListener((setFocused) => {
  const sub = AppState.addEventListener('change', (state) => setFocused(state === 'active'));
  return () => sub.remove();
});

export default function TabsLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#fff',
          tabBarInactiveTintColor: '#a9c4f0',
          tabBarStyle: { backgroundColor: '#2c64b8', borderTopWidth: 0 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Météo',
            tabBarButtonTestID: 'onglet-meteo',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="partly-sunny" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="villes"
          options={{
            title: 'Villes',
            tabBarButtonTestID: 'onglet-villes',
            tabBarIcon: ({ color, size }) => <Ionicons name="list" color={color} size={size} />,
          }}
        />
      </Tabs>
    </QueryClientProvider>
  );
}
