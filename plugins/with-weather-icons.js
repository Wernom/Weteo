const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

// Mêmes noms que dans modules/weteo-icon. Le premier est l'icône de départ.
const VARIANTS = ['soleil', 'nuages', 'pluie', 'neige', 'orage', 'nuit'];

const adaptiveIcon = (variant) => `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@mipmap/ic_weteo_background"/>
  <foreground android:drawable="@mipmap/ic_weteo_${variant}_foreground"/>
  <monochrome android:drawable="@mipmap/ic_weteo_${variant}_monochrome"/>
</adaptive-icon>
`;

const isLauncher = (filter) =>
  filter.category?.some((c) => c.$['android:name'] === 'android.intent.category.LAUNCHER');

// Une entrée de lanceur par icône, dont une seule activée : le module weteo-icon choisit laquelle.
// L'entrée quitte MainActivity, sinon l'app aurait deux icônes.
function withIconAliases(config) {
  return withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application[0];
    const main = application.activity.find((a) => a.$['android:name'] === '.MainActivity');
    main['intent-filter'] = main['intent-filter'].filter((f) => !isLauncher(f));
    application['activity-alias'] = VARIANTS.map((variant, i) => ({
      $: {
        'android:name': `.Icon_${variant}`,
        'android:targetActivity': '.MainActivity',
        'android:enabled': String(i === 0),
        'android:exported': 'true',
        'android:label': '@string/app_name',
        'android:icon': `@mipmap/ic_weteo_${variant}`,
        'android:roundIcon': `@mipmap/ic_weteo_${variant}`,
      },
      'intent-filter': [
        {
          action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
          category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }],
        },
      ],
    }));
    return cfg;
  });
}

function withIconFiles(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const from = path.join(cfg.modRequest.projectRoot, 'assets/icons/android');
      const res = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res');
      const images = path.join(res, 'mipmap-xxxhdpi');
      const adaptive = path.join(res, 'mipmap-anydpi-v26');
      fs.mkdirSync(images, { recursive: true });
      fs.mkdirSync(adaptive, { recursive: true });
      fs.copyFileSync(
        path.join(from, 'background.png'),
        path.join(images, 'ic_weteo_background.png'),
      );
      for (const variant of VARIANTS) {
        const name = `ic_weteo_${variant}`;
        const copy = (layer, suffix) =>
          fs.copyFileSync(
            path.join(from, `${variant}-${layer}.png`),
            path.join(images, `${name}${suffix}.png`),
          );
        copy('foreground', '_foreground');
        copy('monochrome', '_monochrome');
        copy('legacy', '');
        fs.writeFileSync(path.join(adaptive, `${name}.xml`), adaptiveIcon(variant));
      }
      return cfg;
    },
  ]);
}

module.exports = (config) => withIconAliases(withIconFiles(config));
