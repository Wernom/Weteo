import { PALETTES, temperatureColor } from '../theme';

type RGB = [number, number, number];

// « #rrggbb » ou « rgba(r,g,b,a) », posée sur `under` si elle est translucide.
function rgb(color: string, under: RGB = [0, 0, 0]): RGB {
  if (color.startsWith('#')) {
    const n = parseInt(color.slice(1), 16);
    return [n >> 16, (n >> 8) & 255, n & 255];
  }
  const [r, g, b, a] = color.match(/[\d.]+/g)!.map(Number);
  return [r, g, b].map((v, i) => v * a + under[i] * (1 - a)) as RGB;
}

// Contraste WCAG 2.1 entre deux couleurs opaques.
function contrast(a: RGB, b: RGB) {
  const luminance = (c: RGB) =>
    c
      .map((v) => v / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe.each(Object.entries(PALETTES))('thème %s', (_, c) => {
  const stops = Object.values(c.gradients)
    .flat()
    .map((s) => rgb(s));
  // Le texte se pose sur le dégradé, ou sur une carte posée dessus.
  const backgrounds = [...stops, ...stops.map((s) => rgb(c.surface, s))];
  const worst = (color: string, on: RGB[]) => Math.min(...on.map((b) => contrast(rgb(color), b)));

  it.each(['text', 'secondary'] as const)('%s lisible sur tous les fonds (≥ 4,5:1)', (key) => {
    expect(worst(c[key], backgrounds)).toBeGreaterThanOrEqual(4.5);
  });

  it('bouton et bulle lisibles (≥ 4,5:1)', () => {
    expect(contrast(rgb(c.onInverse), rgb(c.inverse))).toBeGreaterThanOrEqual(4.5);
  });

  it('icônes visibles sur tous les dégradés (≥ 3:1)', () => {
    for (const icon of [...Object.values(c.icons), c.text]) {
      expect(worst(icon, stops)).toBeGreaterThanOrEqual(3);
    }
  });

  it.each(['temperatures', 'airQuality', 'uv'] as const)(
    'pastilles %s visibles sur les cartes (≥ 3:1)',
    (key) => {
      const cards = stops.map((s) => rgb(c.surface, s));
      for (const color of c[key]) {
        expect(worst(color, cards)).toBeGreaterThanOrEqual(3);
      }
    },
  );
});

it('couleur de température par palier', () => {
  const { temperatures } = PALETTES.dark;
  expect([-1, 0, 9.9, 10, 20, 27.9, 28].map((t) => temperatureColor(PALETTES.dark, t))).toEqual([
    temperatures[0],
    temperatures[1],
    temperatures[1],
    temperatures[2],
    temperatures[3],
    temperatures[3],
    temperatures[4],
  ]);
});
