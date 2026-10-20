import Ionicons from '@expo/vector-icons/Ionicons';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { formatHour } from './i18n';
import { useScreenStyles } from './Screen';
import { font, radius, space, themedStyles, usePalette } from './theme';
import type { HourlyForecast } from './weather';

// Libellé et couleur du palier d'une valeur : « Correct » et vert pour un indice de l'air de 36.
export type Scale = (value: number) => { label: string; color: string };

// Pastille ronde de la couleur du palier.
export function IndexDot({
  color,
  size,
  testID,
}: {
  color: string;
  size: number;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      style={{ width: size, height: size, borderRadius: radius.pill, backgroundColor: color }}
    />
  );
}

// Carte d'un indice de l'écran Météo (qualité de l'air, UV) : valeur et palier actuels, le
// contenu propre à l'indice (`children`), puis heure par heure. `hours` sont celles du bandeau
// météo, la première est l'heure en cours ; `pick` les sans valeur (null) sont sautées.
// `a11yKey` et `hourA11yKey` sont des clés de traduction : {{index}}, {{level}}, et {{hour}}.
// Avec `help`, toucher la carte affiche ou masque cette explication en bas.
export function IndexCard({
  id,
  testID,
  title,
  value,
  scale,
  a11yKey,
  hourA11yKey,
  hours,
  pick,
  help,
  children,
}: {
  id: string;
  testID: string;
  title: string;
  value: number;
  scale: Scale;
  a11yKey: string;
  hourA11yKey: string;
  hours: HourlyForecast[];
  pick: (hour: HourlyForecast) => number | null;
  help?: ReactNode;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const c = usePalette();
  const shared = useScreenStyles();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const toggle = help ? () => setOpen((o) => !o) : undefined;
  const level = scale(value);
  const forecast = hours.flatMap((hour, i) => {
    const index = pick(hour);
    return index === null ? [] : [{ i, time: hour.time, index }];
  });

  return (
    <View style={shared.card}>
      {/* Le haut de la carte seulement : dans un Pressable, le bandeau ne défile plus. */}
      <Pressable
        style={({ pressed }) => pressed && toggle && styles.pressed}
        onPress={toggle}
        // Le contenu reste lu élément par élément ; l'en-tête porte l'action pour les lecteurs
        // d'écran. Android rend sinon la zone touchable focalisable, et TalkBack la lirait d'un bloc.
        accessible={false}
        importantForAccessibility="no"
      >
        <View style={styles.titleRow}>
          <Text style={shared.cardTitle}>{title}</Text>
          {help && (
            <Ionicons
              name={open ? 'close-circle-outline' : 'information-circle-outline'}
              size={18}
              color={c.secondary}
            />
          )}
        </View>
        <View
          testID={testID}
          style={styles.header}
          accessible
          accessibilityLabel={t(a11yKey, { index: value, level: level.label })}
          accessibilityRole={help ? 'button' : undefined}
          accessibilityHint={help ? t('meteo.explication') : undefined}
          accessibilityState={help ? { expanded: open } : undefined}
          accessibilityActions={help ? [{ name: 'activate' }] : undefined}
          onAccessibilityAction={toggle}
        >
          <IndexDot color={level.color} size={16} testID={`pastille-${id}`} />
          <Text style={styles.index}>{value}</Text>
          <Text style={styles.level}>{level.label}</Text>
        </View>

        {children}
      </Pressable>

      {forecast.length > 0 && (
        <ScrollView
          testID={`bandeau-${id}`}
          horizontal
          // Android : sans ça, le balayage entre villes (onglet Météo) vole le geste au bandeau.
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.strip}
        >
          {forecast.map(({ i, time, index }) => {
            const label = i === 0 ? t('meteo.maintenant') : formatHour(time);
            const hourLevel = scale(index);
            return (
              <View
                key={time}
                testID={`${id}-heure-${i}`}
                style={styles.hour}
                accessible
                accessibilityLabel={t(hourA11yKey, {
                  hour: label,
                  index,
                  level: hourLevel.label,
                })}
              >
                <Text style={styles.time}>{label}</Text>
                <IndexDot color={hourLevel.color} size={12} />
                <Text style={styles.hourIndex}>{index}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      {open && <View style={styles.help}>{help}</View>}
    </View>
  );
}

// Carte d'un indice de l'écran du jour : une pastille et sa phrase (« Max 52 · Moyen à 18 h »).
export function DayIndexCard({
  testID,
  title,
  color,
  text,
}: {
  testID: string;
  title: string;
  color: string;
  text: string;
}) {
  const shared = useScreenStyles();
  const styles = useStyles();
  return (
    <View style={shared.card}>
      <Text style={shared.cardTitle}>{title}</Text>
      <View testID={testID} style={styles.header} accessible>
        <IndexDot color={color} size={16} />
        <Text style={shared.detail}>{text}</Text>
      </View>
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  pressed: { opacity: 0.7 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  help: { gap: space.s, marginTop: space.l },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  index: { color: c.text, fontSize: font.size.title2, fontWeight: font.weight.semibold },
  level: { color: c.text, fontSize: font.size.headline, fontWeight: font.weight.medium },
  strip: { gap: space.xs, marginTop: space.m },
  hour: { alignItems: 'center', gap: space.xs, minWidth: 56, paddingVertical: space.xs },
  time: { color: c.text, fontSize: font.size.small },
  hourIndex: { color: c.text, fontSize: font.size.subhead, fontWeight: font.weight.semibold },
}));
