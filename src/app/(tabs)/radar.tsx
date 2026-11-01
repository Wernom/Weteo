import Ionicons from '@expo/vector-icons/Ionicons';
import { Camera, type CameraRef, Layer, Map, RasterSource } from '@maplibre/maplibre-react-native';
import { useQuery } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useShownCity } from '../../favorites';
import { formatTimestamp } from '../../i18n';
import { RadarSlider } from '../../RadarSlider';
import { font, radius, space, themedStyles, usePalette, useScheme } from '../../theme';
import {
  currentCoords,
  LOCATION_DENIED,
  positionWeatherQuery,
  RADAR_MAX_ZOOM,
  RADAR_TILE_SIZE,
  radarFramesQuery,
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
const FRAME_DURATION = 700;
// La lecture démarre quand même : hors ligne, le chargement pourrait ne jamais finir.
const LOADING_TIMEOUT = 10_000;
const RADAR_OPACITY = 0.7;

// Radar de pluie centré sur le lieu affiché dans l'onglet Météo.
export default function RadarScreen() {
  const { t } = useTranslation();
  const focused = useIsFocused();
  const styles = useStyles();
  const { text, onInverse } = usePalette();
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
  const radar = useQuery({ ...radarFramesQuery, subscribed: focused });
  const frames = radar.data ?? [];
  const last = frames.length - 1;

  // « arret » : seule l'image affichée est chargée. Les autres états gardent toutes les images pour
  // ne pas redemander leurs tuiles à chaque boucle.
  const [player, setPlayer] = useState<'arret' | 'chargement' | 'pause' | 'lecture'>('arret');
  // null : la dernière image, tant qu'on n'a rien choisi.
  const [index, setIndex] = useState<number | null>(null);
  const shownIndex = Math.min(index ?? last, last);
  const shown = frames[shownIndex];

  useEffect(() => {
    if (player !== 'chargement') return;
    const timeout = setTimeout(() => setPlayer('lecture'), LOADING_TIMEOUT);
    return () => clearTimeout(timeout);
  }, [player]);

  const count = frames.length;
  useEffect(() => {
    if (player !== 'lecture' || !focused) return;
    const interval = setInterval(
      () => setIndex((i) => ((i ?? count - 1) + 1) % count),
      FRAME_DURATION,
    );
    return () => clearInterval(interval);
  }, [player, focused, count]);

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
      <Map
        testID="radar-carte"
        style={styles.container}
        mapStyle={MAP_STYLES[scheme]}
        logo={false}
        // Déplacer la carte rechargerait les tuiles de toutes les images : on n'en garde qu'une.
        onRegionWillChange={() => setPlayer('arret')}
        // « Frame » et non « Map » : l'événement « Map » n'arrive qu'une fois, au chargement du style.
        onDidFinishRenderingFrameFully={() =>
          setPlayer((p) => (p === 'chargement' ? 'lecture' : p))
        }
      >
        {/* Zoom libre : au-delà du zoom 7, MapLibre agrandit les tuiles radar (plus floues). */}
        <Camera ref={camera} initialViewState={initial} />
        {(player === 'arret' && shown ? [shown] : frames).map((frame) => (
          // Une nouvelle image change l'URL : la source est recréée.
          <RasterSource
            key={frame.tiles}
            id={`radar-${frame.time}`}
            tiles={[frame.tiles]}
            tileSize={RADAR_TILE_SIZE}
            maxzoom={RADAR_MAX_ZOOM}
          >
            {/* Opacité 0 : les tuiles se chargent sans s'afficher. Sans fondu, pour un défilement net. */}
            <Layer
              type="raster"
              id={`radar-${frame.time}`}
              paint={{
                'raster-opacity': frame === shown ? RADAR_OPACITY : 0,
                'raster-opacity-transition': { duration: 0 },
                'raster-fade-duration': 0,
              }}
            />
          </RasterSource>
        ))}
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
      <View style={styles.bottom} pointerEvents="box-none">
        {radar.isError && (
          <Text style={[styles.chip, styles.error]} accessibilityLiveRegion="polite">
            {t('radar.indisponible')}
          </Text>
        )}
        {shown && (
          <View style={[styles.chip, styles.player]}>
            <Pressable
              testID="radar-lecture"
              onPress={() =>
                setPlayer((p) => {
                  if (p === 'arret') return 'chargement';
                  return p === 'pause' ? 'lecture' : 'pause';
                })
              }
              accessibilityRole="button"
              accessibilityLabel={t(
                player === 'chargement'
                  ? 'radar.chargement'
                  : player === 'lecture'
                    ? 'radar.pause'
                    : 'radar.lecture',
              )}
              style={styles.play}
            >
              {player === 'chargement' ? (
                <ActivityIndicator color={onInverse} />
              ) : (
                <Ionicons
                  name={player === 'lecture' ? 'pause' : 'play'}
                  size={24}
                  color={onInverse}
                />
              )}
            </Pressable>
            <RadarSlider
              count={frames.length}
              index={shownIndex}
              label={t('radar.curseur')}
              value={formatTimestamp(shown.time)}
              onChange={(i) => {
                setIndex(i);
                setPlayer('pause');
              }}
            />
            {/* Pas de région annoncée : le lecteur d'écran lirait chaque image de l'animation. */}
            <Text testID="radar-heure" style={styles.time}>
              {formatTimestamp(shown.time)}
            </Text>
          </View>
        )}
      </View>
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
  bottom: {
    position: 'absolute',
    left: space.l,
    right: space.l,
    bottom: space.l,
    gap: space.s,
  },
  error: {
    alignSelf: 'center',
    color: c.text,
    fontSize: font.size.small,
    overflow: 'hidden',
  },
  // Fond plein : les noms de la carte ne doivent pas transparaître sous l'heure.
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 0,
    paddingHorizontal: space.xs,
    backgroundColor: c.inverse,
  },
  // Cible tactile de 48 dp.
  play: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  time: {
    color: c.onInverse,
    fontSize: font.size.footnote,
    fontVariant: ['tabular-nums'],
    marginRight: space.s,
  },
}));
