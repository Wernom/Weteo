import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import { StatusBar } from 'expo-status-bar';

export default function TabsLayout() {
  return (
    <>
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
    </>
  );
}
