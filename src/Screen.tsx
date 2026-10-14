import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps, ReactNode } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';

import { themedStyles, usePalette } from './theme';

// Fond dégradé plein écran, celui du jour par défaut (écrans sans météo propre).
export function Screen({
  colors,
  style,
  testID,
  children,
}: {
  colors?: ComponentProps<typeof LinearGradient>['colors'];
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children: ReactNode;
}) {
  const c = usePalette();
  return (
    <LinearGradient
      testID={testID}
      colors={colors ?? c.gradients.jour}
      style={[styles.screen, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1 } });

// Styles communs aux écrans : titre, et cartes translucides posées sur le dégradé.
export const useScreenStyles = themedStyles((c) => ({
  title: { color: c.text, fontSize: 28, fontWeight: '600', textAlign: 'center' },
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
