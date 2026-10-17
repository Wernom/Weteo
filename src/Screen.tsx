import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps, ReactNode } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';

import { font, radius, space, themedStyles, usePalette } from './theme';

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
  title: {
    color: c.text,
    fontSize: font.size.title1,
    fontWeight: font.weight.semibold,
    textAlign: 'center',
  },
  card: {
    alignSelf: 'stretch',
    marginTop: space.xl,
    padding: space.l,
    borderRadius: radius.l,
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  details: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', gap: space.s },
  detail: { color: c.text, fontSize: font.size.subhead, fontWeight: font.weight.medium },
  cardTitle: {
    color: c.secondary,
    fontSize: font.size.footnote,
    fontWeight: font.weight.semibold,
    letterSpacing: 0.8,
    marginBottom: space.s,
    textTransform: 'uppercase',
  },
}));
