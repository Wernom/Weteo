import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { hourLabel } from './HourlyStrip';
import { HourlyForecast } from './weather';

const BAND = 30; // bande de la bulle, au-dessus de la courbe : elle ne la cache jamais
const HEIGHT = BAND + 160;
const AXIS = 34; // gouttière gauche des températures
const RIGHT = 12;
const TOP = BAND + 12;
const BOTTOM = 22; // place des heures sous la courbe
const PLOT_HEIGHT = HEIGHT - TOP - BOTTOM;
const BUBBLE_WIDTH = 84;
const X_TICKS = [0, 6, 12, 18, 23];

// Graduations entières de l'axe vertical (au plus 4 intervalles), qui encadrent min et max.
export function axisTicks(min: number, max: number) {
  const step = [1, 2, 5, 10, 20].find((s) => Math.ceil(max / s) - Math.floor(min / s) <= 4) ?? 50;
  const lo = Math.floor(min / step) * step;
  const hi = Math.max(Math.ceil(max / step) * step, lo + step);
  const ticks = [];
  for (let t = lo; t <= hi; t += step) ticks.push(t);
  return ticks;
}

// Points « x,y » de la courbe dans une boîte width × height, l'axe allant de lo (bas) à hi (haut).
export function chartPoints(
  temps: number[],
  width: number,
  height: number,
  lo: number,
  hi: number,
) {
  const step = width / Math.max(temps.length - 1, 1);
  return temps
    .map(
      (t, i) =>
        `${+(i * step).toFixed(2)},${+(height - ((t - lo) / (hi - lo)) * height).toFixed(2)}`,
    )
    .join(' ');
}

// Courbe des températures heure par heure d'une journée (00:00 → 23:00, heure locale du lieu).
// Toucher ou glisser sur la courbe affiche l'heure et la température à cet endroit.
export function TemperatureChart({ hours }: { hours: HourlyForecast[] }) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const temps = hours.map((h) => h.temperature);
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const ticks = axisTicks(min, max);
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const plotWidth = Math.max(width - AXIS - RIGHT, 0);
  const step = plotWidth / Math.max(hours.length - 1, 1);
  const y = (t: number) => PLOT_HEIGHT - ((t - lo) / (hi - lo)) * PLOT_HEIGHT;

  const describe = (h: HourlyForecast) => `${Math.round(h.temperature)}° à ${hourLabel(h.time)}`;
  const coldest = hours[temps.indexOf(min)];
  const warmest = hours[temps.indexOf(max)];

  const select = (x: number) => {
    if (step > 0)
      setSelected(Math.min(Math.max(Math.round((x - AXIS) / step), 0), hours.length - 1));
  };
  const point = selected === null ? null : hours[selected];

  return (
    <View>
      <View
        testID="courbe-temperatures"
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Minimum ${describe(coldest)}, maximum ${describe(warmest)}`}
        accessibilityValue={
          point
            ? { text: `${hourLabel(point.time)}, ${Math.round(point.temperature)}°` }
            : undefined
        }
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          const delta = e.nativeEvent.actionName === 'increment' ? 1 : -1;
          setSelected((i) => Math.min(Math.max((i ?? -delta) + delta, 0), hours.length - 1));
        }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        // Le glissement horizontal reste au graphique au lieu de faire défiler l'écran.
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => select(e.nativeEvent.locationX)}
        onResponderMove={(e) => select(e.nativeEvent.locationX)}
      >
        {/* Le SVG ne capte rien : locationX reste relatif à la zone tactile entière. */}
        <Svg width="100%" height={HEIGHT} pointerEvents="none">
          {ticks.map((t) => (
            <G key={t}>
              <Line
                x1={AXIS}
                x2={AXIS + plotWidth}
                y1={TOP + y(t)}
                y2={TOP + y(t)}
                stroke="rgba(255,255,255,0.25)"
                strokeDasharray="3 4"
              />
              <SvgText
                x={AXIS - 6}
                y={TOP + y(t) + 4}
                fill="#cfe3ff"
                fontSize={12}
                textAnchor="end"
              >
                {`${t}°`}
              </SvgText>
            </G>
          ))}
          {X_TICKS.map((h) => (
            <SvgText
              key={h}
              x={AXIS + h * step}
              y={HEIGHT - 4}
              fill="#cfe3ff"
              fontSize={12}
              textAnchor="middle"
            >
              {`${h} h`}
            </SvgText>
          ))}
          <G x={AXIS} y={TOP}>
            <Polyline
              points={chartPoints(temps, plotWidth, PLOT_HEIGHT, lo, hi)}
              fill="none"
              stroke="#fff"
              strokeWidth={3}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {point && selected !== null && (
              <>
                {/* Part de la bulle pour la relier au point. */}
                <Line
                  x1={selected * step}
                  x2={selected * step}
                  y1={BAND - TOP}
                  y2={PLOT_HEIGHT}
                  stroke="rgba(255,255,255,0.7)"
                />
                <Circle cx={selected * step} cy={y(point.temperature)} r={5} fill="#fff" />
              </>
            )}
          </G>
        </Svg>
        {point && selected !== null && (
          <View
            pointerEvents="none"
            style={[
              styles.bubble,
              {
                left: Math.min(
                  Math.max(AXIS + selected * step - BUBBLE_WIDTH / 2, 0),
                  width - BUBBLE_WIDTH,
                ),
              },
            ]}
          >
            <Text style={styles.bubbleText}>
              {hourLabel(point.time)} · {Math.round(point.temperature)}°
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.hint}>Touchez la courbe pour le détail heure par heure.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    top: 0,
    width: BUBBLE_WIDTH,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  bubbleText: { color: '#1f2d5c', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  hint: { color: '#cfe3ff', fontSize: 13, textAlign: 'center', marginTop: 4 },
});
