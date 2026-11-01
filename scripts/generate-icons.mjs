// Génère les PNG de l'icône à partir des SVG de assets/icons : `node scripts/generate-icons.mjs`.
// Les PNG sont versionnés : à relancer seulement quand un SVG change.
import { Buffer } from 'node:buffer';
import { mkdirSync, readFileSync } from 'node:fs';
import sharp from 'sharp';

const VARIANTS = ['soleil', 'nuages', 'pluie', 'neige', 'orage', 'nuit'];
const source = (name) => readFileSync(`assets/icons/${name}.svg`, 'utf8');

// Repère de 108 unités ; `density` pour tracer net à la taille voulue au lieu d'agrandir.
const layer = (svg, size) =>
  sharp(Buffer.from(svg), { density: (72 * size) / 108 })
    .resize(size, size)
    .png({ compressionLevel: 9 });

// Le système ne lit que l'opacité du calque monochrome : mêmes formes, une seule couleur.
const monochrome = (svg) => svg.replace(/\b(fill|stroke)="(?!none)[^"]*"/g, '$1="#ffffff"');

// Icône carrée : fond et premier plan, recadrés sur les 72 unités qu'un lanceur laisse voir.
async function square(variant, size) {
  const full = Math.round((size * 108) / 72);
  const foreground = await layer(source(variant), full).toBuffer();
  const margin = Math.round((full - size) / 2);
  const icon = await layer(source('background'), full)
    .composite([{ input: foreground }])
    .toBuffer();
  return sharp(icon).extract({ left: margin, top: margin, width: size, height: size });
}

// Lancé depuis la racine du projet ; xxxhdpi seul : le système réduit pour les autres densités.
mkdirSync('assets/icons/android', { recursive: true });
for (const variant of VARIANTS) {
  const svg = source(variant);
  await layer(svg, 432).toFile(`assets/icons/android/${variant}-foreground.png`);
  await layer(monochrome(svg), 432).toFile(`assets/icons/android/${variant}-monochrome.png`);
  // Android 7 ne connaît pas les icônes adaptatives.
  await (await square(variant, 192)).toFile(`assets/icons/android/${variant}-legacy.png`);
}
await layer(source('background'), 432).toFile('assets/icons/android/background.png');

// Icône par défaut, celle de app.json et de F-Droid.
await layer(source('soleil'), 1024).toFile('assets/android-icon-foreground.png');
await layer(source('background'), 1024).toFile('assets/android-icon-background.png');
await layer(monochrome(source('soleil')), 1024).toFile('assets/android-icon-monochrome.png');
await (await square('soleil', 1024)).toFile('assets/icon.png');
await (await square('soleil', 48)).toFile('assets/favicon.png');
await (await square('soleil', 512)).toFile('fastlane/metadata/android/en-US/icon.png');
