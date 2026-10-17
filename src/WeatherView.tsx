import Ionicons from '@expo/vector-icons/Ionicons';
import type { UseQueryResult } from '@tanstack/react-query';
import type { Ref } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  ScrollViewProps,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DailyList } from './DailyList';
import { ErrorScreen } from './ErrorScreen';
import { HourlyStrip } from './HourlyStrip';
import { Screen, useScreenStyles } from './Screen';
import { font, gradientFor, iconColor, space, themedStyles, usePalette } from './theme';
import { useUnits } from './units';
import { describeWeather, WeatherData } from './weather';

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
  const shared = useScreenStyles();
  const { top } = useSafeAreaInsets();
  const reload = () => refetch();
  const gradient = gradientFor(c, data);

  if (!data && !isFetching) {
    return <ErrorScreen message={error?.message || 'erreurs.chargement'} onRetry={reload} />;
  }
  if (!data) {
    return (
      <Screen colors={gradient} style={styles.center}>
        <ActivityIndicator size="large" color={c.text} />
      </Screen>
    );
  }

  const { current, hourly, daily } = data.forecast;
  const now = describeWeather(current.weatherCode, current.isDay);
  const today = daily[0];
  // Le bandeau part de l'heure en cours (« 2026-10-05T14:00 » >= « 2026-10-05T14 »).
  const start = hourly.findIndex((h) => h.time >= current.time.slice(0, 13));

  return (
    <Screen testID="fond-meteo" colors={gradient}>
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.content, { paddingTop: top + space.l }]}
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
        <Text style={shared.title}>{data.place ?? t('meteo.maPosition')}</Text>
        <Ionicons
          name={now.icon}
          size={72}
          color={iconColor(c, now.icon)}
          style={styles.icon}
          accessible={false}
        />
        <Text style={styles.temp} maxFontSizeMultiplier={1.5}>
          {units.temp(current.temperature)}
        </Text>
        <Text style={styles.label}>{now.label}</Text>
        {today && (
          <Text style={styles.range}>
            {t('meteo.maxMin', { max: units.temp(today.max), min: units.temp(today.min) })}
          </Text>
        )}

        <View style={[shared.card, shared.details]}>
          <Text style={shared.detail}>
            {t('meteo.ressenti', { temperature: units.temp(current.apparentTemperature) })}
          </Text>
          <Text style={shared.detail}>{t('meteo.humidite', { humidity: current.humidity })}</Text>
          <Text style={shared.detail}>
            {t('meteo.vent', { speed: units.wind(current.windSpeed) })}
          </Text>
        </View>

        <View style={shared.card}>
          <Text style={shared.cardTitle}>{t('meteo.heureParHeure')}</Text>
          <HourlyStrip hours={hourly.slice(start, start + 48)} />
        </View>

        <View style={shared.card}>
          <Text style={shared.cardTitle}>{t('meteo.septJours')}</Text>
          <DailyList days={daily} ville={ville} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const useStyles = themedStyles((c) => ({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xxl,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: space.l,
    paddingBottom: space.xxxxl,
  },
  position: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginBottom: space.xs },
  positionText: {
    color: c.secondary,
    fontSize: font.size.subhead,
    fontWeight: font.weight.semibold,
    textTransform: 'uppercase',
  },
  icon: { marginTop: space.s },
  temp: {
    color: c.text,
    fontSize: font.size.hero,
    fontWeight: font.weight.thin,
    lineHeight: 120,
    textShadowColor: c.textShadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  label: {
    color: c.text,
    fontSize: font.size.title3,
    fontWeight: font.weight.medium,
    textAlign: 'center',
  },
  range: { color: c.secondary, fontSize: font.size.body, marginTop: space.xs },
}));
