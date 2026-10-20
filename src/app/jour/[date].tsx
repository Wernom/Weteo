import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';

import { DayAirQualityCard } from '../../AirQualityCard';
import { dayLabel } from '../../DailyList';
import { formatClock } from '../../i18n';
import { Screen, useScreenStyles } from '../../Screen';
import { TemperatureChart } from '../../TemperatureChart';
import { font, iconColor, space, themedStyles, usePalette } from '../../theme';
import { useUnits } from '../../units';
import { DayUvCard } from '../../UvCard';
import { cityQueryKey, describeWeather, WEATHER_QUERY_KEY, WeatherData } from '../../weather';

export { ErrorBoundary } from '../../ErrorScreen';

export default function DayScreen() {
  const { t } = useTranslation();
  const units = useUnits();
  const c = usePalette();
  const styles = useStyles();
  const shared = useScreenStyles();
  const headerHeight = useHeaderHeight();
  const { date, ville } = useLocalSearchParams<{ date: string; ville?: string }>();
  // On arrive depuis la liste 7 jours de ma position ou d'une ville : sa météo est déjà en cache.
  const key = ville ? cityQueryKey(ville) : WEATHER_QUERY_KEY;
  // Abonné au cache : un rafraîchissement de la météo se voit aussi ici.
  const client = useQueryClient();
  const forecast = useSyncExternalStore(client.getQueryCache().subscribe, () =>
    client.getQueryData<WeatherData>(key),
  )?.forecast;
  const index = forecast?.daily.findIndex((d) => d.date === date) ?? -1;
  if (!forecast || index === -1) return <Redirect href="/" />;

  const day = forecast.daily[index];
  const hours = forecast.hourly.filter((h) => h.time.startsWith(date));
  const d = describeWeather(day.weatherCode);
  const gradient = c.gradients[d.theme];

  return (
    <Screen colors={gradient}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: dayLabel(date, index),
          headerTransparent: true,
          headerTintColor: c.text,
          headerBackTitle: t('onglets.meteo'),
        }}
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: headerHeight + space.l }]}>
        <Ionicons name={d.icon} size={64} color={iconColor(c, d.icon)} accessible={false} />
        <Text style={styles.label}>{d.label}</Text>
        <Text style={styles.range}>
          {units.temp(day.max)} / {units.temp(day.min)}
        </Text>

        <View style={shared.card}>
          <Text style={shared.cardTitle}>{t('jour.temperatures')}</Text>
          <TemperatureChart hours={hours} />
        </View>

        <View style={[shared.card, shared.details]}>
          <Text style={shared.detail}>
            {t('jour.precipitations', {
              amount: units.rain(day.precipitation),
              chance: day.rainChance,
            })}
          </Text>
          <Text style={shared.detail}>{t('jour.lever', { time: formatClock(day.sunrise) })}</Text>
          <Text style={shared.detail}>{t('jour.coucher', { time: formatClock(day.sunset) })}</Text>
        </View>

        <DayAirQualityCard hours={hours} />
        <DayUvCard max={day.uvMax} />
      </ScrollView>
    </Screen>
  );
}

const useStyles = themedStyles((c) => ({
  content: {
    alignItems: 'center',
    paddingHorizontal: space.l,
    paddingBottom: space.xxxxl,
  },
  label: {
    color: c.text,
    fontSize: font.size.title3,
    fontWeight: font.weight.medium,
    textAlign: 'center',
    marginTop: space.s,
  },
  range: {
    color: c.text,
    fontSize: font.size.title1,
    fontWeight: font.weight.light,
    marginTop: space.xs,
  },
}));
