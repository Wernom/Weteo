import { useState } from 'react';
import { View } from 'react-native';

import { radius, space, themedStyles } from './theme';

const THUMB = 16;

// Curseur du temps du radar : toucher ou glisser choisit l'image la plus proche.
export function RadarSlider({
  count,
  index,
  label,
  value,
  onChange,
}: {
  count: number;
  index: number;
  label: string;
  value: string;
  onChange: (index: number) => void;
}) {
  const styles = useStyles();
  const [width, setWidth] = useState(0);
  const last = count - 1;
  const clamp = (i: number) => Math.min(Math.max(i, 0), last);

  const select = (x: number) => {
    if (width > 0) onChange(clamp(Math.round((x / width) * last)));
  };

  return (
    <View
      testID="radar-curseur"
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) =>
        onChange(clamp(index + (e.nativeEvent.actionName === 'increment' ? 1 : -1)))
      }
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      // Le glissement reste au curseur au lieu de déplacer la carte.
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => select(e.nativeEvent.locationX)}
      onResponderMove={(e) => select(e.nativeEvent.locationX)}
      style={styles.zone}
    >
      {/* La barre ne capte rien : locationX reste relatif à la zone tactile entière. */}
      <View style={styles.track} pointerEvents="none">
        <View style={[styles.thumb, { left: `${last > 0 ? (index / last) * 100 : 100}%` }]} />
      </View>
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  // Cible tactile de 48 dp. La marge laisse dépasser la pastille aux deux bouts.
  zone: { flex: 1, height: 48, justifyContent: 'center', marginHorizontal: space.s },
  // Posé sur le fond plein du lecteur.
  track: { height: 4, borderRadius: radius.s, backgroundColor: `${c.onInverse}59` },
  thumb: {
    position: 'absolute',
    top: (4 - THUMB) / 2,
    width: THUMB,
    height: THUMB,
    marginLeft: -THUMB / 2,
    borderRadius: radius.pill,
    backgroundColor: c.onInverse,
  },
}));
