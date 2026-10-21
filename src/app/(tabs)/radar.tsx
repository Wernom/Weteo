import Ionicons from '@expo/vector-icons/Ionicons';
import { Camera, type CameraRef, Layer, Map, RasterSource } from '@maplibre/maplibre-react-native';
import { useQuery } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useShownCity } from '../../favorites';
import { font, radius, space, themedStyles, usePalette, useScheme } from '../../theme';
import {
  currentCoords,
  LOCATION_DENIED,
  positionWeatherQuery,
  RADAR_MAX_ZOOM,
  radarTilesQuery,
  TEN_MINUTES,
} from '../../weather';

export { ErrorBoundary } from '../../ErrorScreen';

// Fond libre OpenFreeMap (données OpenStreetMap), sans clé ni pistage, au thème de l'app.
const MAP_STYLES = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};
const CITY_ZOOM = 6;
// Sans lieu connu (localisation refusée, aucun favori) : la France entière.
const FRANCE = { center: [2.5, 46.5] as [number, number], zoom: 4 };

// Radar de pluie centré sur le lieu affiché dans l'onglet Météo.
export default function RadarScreen() {
  const { t } = useTranslation();
  const focused = useIsFocused();
  const styles = useStyles();
  const { text } = usePalette();
  const scheme = useScheme();
  const { top } = useSafeAreaInsets();

  const city = useShownCity();
  // Refus déjà essuyé par l'écran Météo, lu dans son cache : on ne redemande pas la permission.
  const denied =
    useQuery({ ...positionWeatherQuery, enabled: false }).error?.message === LOCATION_DENIED;
  // Coordonnées gardées en mémoire seulement. Comme l'écran Météo, un refus ne redemande pas
  // la permission à chaque retour sur l'onglet.
  const position = useQuery({
    queryKey: ['radar', 'position'],
    queryFn: currentCoords,
    staleTime: TEN_MINUTES,
    enabled: !city && !denied,
    subscribed: focused,
    retryOnMount: false,
  });
  const radar = useQuery({ ...radarTilesQuery, subscribed: focused });

  const lng = city ? city.longitude : position.data?.longitude;
  const lat = city ? city.latitude : position.data?.latitude;
  const known = lng !== undefined && lat !== undefined;

  // La carte s'ouvre sur le lieu ; elle ne s'y déplace ensuite qu'au changement de lieu.
  const camera = useRef<CameraRef>(null);
  const [initial] = useState(() =>
    known ? { center: [lng, lat] as [number, number], zoom: CITY_ZOOM } : FRANCE,
  );
  const opened = useRef(false);
  useEffect(() => {
    if (!opened.current) {
      opened.current = true;
      return;
    }
    if (lng !== undefined && lat !== undefined) {
      camera.current?.flyTo({ center: [lng, lat], zoom: CITY_ZOOM });
    }
  }, [lng, lat]);

  return (
    <View style={styles.container}>
      <Map testID="radar-carte" style={styles.container} mapStyle={MAP_STYLES[scheme]} logo={false}>
        {/* Zoom libre : au-delà du zoom 7, MapLibre agrandit les tuiles radar (plus floues). */}
        <Camera ref={camera} initialViewState={initial} />
        {radar.data && (
          // Une nouvelle image change l'URL : la source est recréée.
          <RasterSource
            key={radar.data}
            id="radar"
            tiles={[radar.data]}
            tileSize={256}
            maxzoom={RADAR_MAX_ZOOM}
          >
            <Layer type="raster" id="radar" paint={{ 'raster-opacity': 0.7 }} />
          </RasterSource>
        )}
      </Map>
      <View style={[styles.top, { top: top + space.s }]} pointerEvents="box-none">
        <Pressable
          onPress={() => Linking.openURL('https://www.rainviewer.com/')}
          accessibilityRole="link"
          style={styles.chip}
        >
          {/* Mention demandée par RainViewer : non traduite. */}
          <Text style={styles.credit}>Weather data by RainViewer</Text>
        </Pressable>
        {known && (
          <Pressable
            testID="radar-recentrer"
            onPress={() => camera.current?.flyTo({ center: [lng, lat], zoom: CITY_ZOOM })}
            accessibilityRole="button"
            accessibilityLabel={t('radar.recentrer')}
            style={[styles.chip, styles.recenter]}
          >
            <Ionicons name="locate" size={22} color={text} />
          </Pressable>
        )}
      </View>
      {radar.isError && (
        <Text style={[styles.chip, styles.error]} accessibilityLiveRegion="polite">
          {t('radar.indisponible')}
        </Text>
      )}
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  container: { flex: 1 },
  top: {
    position: 'absolute',
    left: space.l,
    right: space.l,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  chip: {
    paddingHorizontal: space.m,
    paddingVertical: space.s,
    borderRadius: radius.pill,
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  credit: { color: c.text, fontSize: font.size.footnote, textDecorationLine: 'underline' },
  // Cible tactile de 48 dp.
  recenter: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  error: {
    position: 'absolute',
    bottom: space.l,
    alignSelf: 'center',
    color: c.text,
    fontSize: font.size.small,
    overflow: 'hidden',
  },
}));
