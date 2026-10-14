import Ionicons from '@expo/vector-icons/Ionicons';
import type { UseQueryResult } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import type { Ref } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DailyList } from './DailyList';
import { ErrorScreen } from './ErrorScreen';
import { HourlyStrip } from './HourlyStrip';
import { iconColor, Palette, themedStyles, usePalette } from './theme';
import { useUnits } from './units';
import { describeWeather, WeatherData } from './weather';

// Fond du temps actuel, ou du jour tant que la météo n'est pas chargée.
export function gradientFor(c: Palette, data: WeatherData | undefined) {
  const current = data?.forecast.current;
  return c.gradients[current ? describeWeather(current.weatherCode, current.isDay).theme : 'jour'];
}

// Météo d'un lieu (ma position ou une ville) : chargement, erreur avec « Réessayer », puis le détail.
// `ville` est passé au détail d'un jour pour qu'il lise la météo de la bonne ville ; sans `ville`,
// c'est ma position, signalée pour ne pas la confondre avec un favori de la même ville.
// `scrollRef` et `onScroll` laissent l'écran Météo aligner le défilement de ses pages.
export function WeatherView({
  query: { data, error, isFetching, isRefetching, refetch },
  ville,
  scrollRef,
  onScroll,
}: {
  query: UseQueryResult<WeatherData>;
  ville?: string;
  scrollRef?: Ref<ScrollView>;
  onScroll?: ScrollViewProps['onScroll'];
}) {
  const { t } = useTranslation();
  const units = useUnits();
  const c = usePalette();
  const styles = useStyles();
  const cardStyles = useCardStyles();
  const reload = () => refetch();
  const gradient = gradientFor(c, data);

  if (!data && !isFetching) {
    return <ErrorScreen message={error?.message || 'erreurs.chargement'} onRetry={reload} />;
  }
  if (!data) {
    return (
      <LinearGradient colors={gradient} style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={c.text} />
      </LinearGradient>
    );
  }

  const { current, hourly, daily } = data.forecast;
  const now = describeWeather(current.weatherCode, current.isDay);
  const today = daily[0];
  // Le bandeau part de l'heure en cours (« 2026-10-05T14:00 » >= « 2026-10-05T14 »).
  const start = hourly.findIndex((h) => h.time >= current.time.slice(0, 13));

  return (
    <LinearGradient testID="fond-meteo" colors={gradient} style={styles.container}>
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={reload} tintColor={c.text} />
        }
      >
        {!ville && data.place && (
          <View testID="mention-position" style={styles.position}>
            <Ionicons name="navigate" size={14} color={c.secondary} accessible={false} />
            <Text style={styles.positionText}>{t('meteo.maPosition')}</Text>
          </View>
        )}
        <Text style={styles.place}>{data.place ?? t('meteo.maPosition')}</Text>
        <Ionicons
          name={now.icon}
          size={72}
          color={iconColor(c, now.icon)}
          style={styles.icon}
          accessible={false}
        />
        <Text style={styles.temp} maxFontSizeMultiplier={1.5}>
          {units.temp(current.temperature)}°
        </Text>
        <Text style={styles.label}>{now.label}</Text>
        {today && (
          <Text style={styles.range}>
            {t('meteo.maxMin', { max: units.temp(today.max), min: units.temp(today.min) })}
          </Text>
        )}

        <View style={[cardStyles.card, cardStyles.details]}>
          <Text style={cardStyles.detail}>
            {t('meteo.ressenti', { temperature: units.temp(current.apparentTemperature) })}
          </Text>
          <Text style={cardStyles.detail}>
            {t('meteo.humidite', { humidity: current.humidity })}
          </Text>
          <Text style={cardStyles.detail}>
            {t('meteo.vent', { speed: units.wind(current.windSpeed) })}
          </Text>
        </View>

        <View style={cardStyles.card}>
          <Text style={cardStyles.cardTitle}>{t('meteo.heureParHeure')}</Text>
          <HourlyStrip hours={hourly.slice(start, start + 48)} />
        </View>

        <View style={cardStyles.card}>
          <Text style={cardStyles.cardTitle}>{t('meteo.septJours')}</Text>
          <DailyList days={daily} ville={ville} />
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const useStyles = themedStyles((c) => ({
  container: { flex: 1 },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    paddingTop: 64,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  position: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  positionText: { color: c.secondary, fontSize: 15, fontWeight: '600', textTransform: 'uppercase' },
  place: { color: c.text, fontSize: 28, fontWeight: '600', textAlign: 'center' },
  icon: { marginTop: 8 },
  temp: {
    color: c.text,
    fontSize: 112,
    fontWeight: '200',
    lineHeight: 120,
    textShadowColor: c.textShadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  label: { color: c.text, fontSize: 22, fontWeight: '500', textAlign: 'center' },
  range: { color: c.secondary, fontSize: 17, marginTop: 4 },
}));

// Cartes translucides sur le dégradé, reprises par le détail d'un jour.
export const useCardStyles = themedStyles((c) => ({
  card: {
    alignSelf: 'stretch',
    marginTop: 20,
    padding: 16,
    borderRadius: 20,
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  details: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', gap: 8 },
  detail: { color: c.text, fontSize: 15, fontWeight: '500' },
  cardTitle: {
    color: c.secondary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
}));
