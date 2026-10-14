import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';

import { dayLabel } from '../../DailyList';
import { formatClock } from '../../i18n';
import { TemperatureChart } from '../../TemperatureChart';
import { iconColor, themedStyles, usePalette } from '../../theme';
import { useUnits } from '../../units';
import { useCardStyles } from '../../WeatherView';
import { cityQueryKey, describeWeather, WEATHER_QUERY_KEY, WeatherData } from '../../weather';

export { ErrorBoundary } from '../../ErrorScreen';

export default function DayScreen() {
  const { t } = useTranslation();
  const units = useUnits();
  const c = usePalette();
  const styles = useStyles();
  const cardStyles = useCardStyles();
  const { date, ville } = useLocalSearchParams<{ date: string; ville?: string }>();
  // On arrive depuis la liste 7 jours de ma position ou d'une ville : sa météo est déjà en cache.
  const key = ville ? cityQueryKey(ville) : WEATHER_QUERY_KEY;
  const forecast = useQueryClient().getQueryData<WeatherData>(key)?.forecast;
  const index = forecast?.daily.findIndex((d) => d.date === date) ?? -1;
  if (!forecast || index === -1) return <Redirect href="/" />;

  const day = forecast.daily[index];
  const hours = forecast.hourly.filter((h) => h.time.startsWith(date));
  const d = describeWeather(day.weatherCode);
  const gradient = c.gradients[d.theme];

  return (
    <LinearGradient colors={gradient} style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: dayLabel(date, index),
          headerTransparent: true,
          headerTintColor: c.text,
          headerBackTitle: t('onglets.meteo'),
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Ionicons name={d.icon} size={64} color={iconColor(c, d.icon)} accessible={false} />
        <Text style={styles.label}>{d.label}</Text>
        <Text style={styles.range}>
          {units.temp(day.min)}° / {units.temp(day.max)}°
        </Text>

        <View style={cardStyles.card}>
          <Text style={cardStyles.cardTitle}>{t('jour.temperatures')}</Text>
          <TemperatureChart hours={hours} />
        </View>

        <View style={[cardStyles.card, cardStyles.details]}>
          <Text style={cardStyles.detail}>
            {t('jour.precipitations', {
              amount: units.rain(day.precipitation),
              chance: day.rainChance,
            })}
          </Text>
          <Text style={cardStyles.detail}>
            {t('jour.lever', { time: formatClock(day.sunrise) })}
          </Text>
          <Text style={cardStyles.detail}>
            {t('jour.coucher', { time: formatClock(day.sunset) })}
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const useStyles = themedStyles((c) => ({
  container: { flex: 1 },
  content: {
    alignItems: 'center',
    paddingTop: 110,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  label: { color: c.text, fontSize: 22, textAlign: 'center', marginTop: 8 },
  range: { color: c.text, fontSize: 28, fontWeight: '300', marginTop: 4 },
}));
