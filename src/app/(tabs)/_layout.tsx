import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';

import { tabBarTheme, usePalette } from '../../theme';

export default function TabsLayout() {
  const { t } = useTranslation();
  const c = usePalette();
  const theme = tabBarTheme.use();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.text,
        tabBarInactiveTintColor: c.secondary,
        tabBarStyle: { backgroundColor: c.gradients[theme][2], borderTopWidth: 0 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('onglets.meteo'),
          tabBarButtonTestID: 'onglet-meteo',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="partly-sunny" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="villes"
        options={{
          title: t('onglets.villes'),
          tabBarButtonTestID: 'onglet-villes',
          tabBarIcon: ({ color, size }) => <Ionicons name="list" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="reglages"
        options={{
          title: t('onglets.reglages'),
          tabBarButtonTestID: 'onglet-reglages',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
