// Lance les tests Maestro de bout en bout : démarre l'émulateur si besoin,
// construit et installe l'APK release, puis joue les flows de .maestro.
import { execSync, spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

// `npm run test:e2e -- choisir-unites villes-favorites` : seulement ces flows de .maestro.
// Vérifiés avant le build, qui prend plusieurs minutes.
const flows = process.argv
  .slice(2)
  .map((f) => path.join('.maestro', `${path.basename(f, path.extname(f))}.yaml`));
const missing = flows.filter((f) => !existsSync(f));
if (missing.length) {
  const available = readdirSync('.maestro').map((f) => path.basename(f, '.yaml'));
  console.error(
    `Flows introuvables : ${missing.join(', ')}\nDisponibles : ${available.join(', ')}`,
  );
  process.exit(1);
}

const run = (cmd, options) => execSync(cmd, { stdio: 'inherit', ...options });
const output = (cmd) => execSync(cmd, { encoding: 'utf8' });
const tool = (dir, name) =>
  process.env.ANDROID_HOME ? path.join(process.env.ANDROID_HOME, dir, name) : name;
const adb = `"${tool('platform-tools', 'adb')}"`;

const bootId = () => output(`${adb} shell cat /proc/sys/kernel/random/boot_id`).trim();

// `previousBoot` : après un `adb reboot`, l'ancien système peut encore répondre « démarré » ;
// on attend un nouveau démarrage.
async function waitForBoot(previousBoot) {
  run(`${adb} wait-for-device`, { timeout: 180_000 });
  const booted = () => {
    try {
      return (
        output(`${adb} shell getprop sys.boot_completed`).trim() === '1' &&
        bootId() !== previousBoot
      );
    } catch {
      return false; // l'émulateur peut être encore « offline »
    }
  };
  const deadline = Date.now() + 300_000;
  while (!booted()) {
    if (Date.now() > deadline) throw new Error("L'émulateur n'a pas démarré en 5 minutes.");
    await sleep(3000);
  }
}

if (!/\tdevice\b/.test(output(`${adb} devices`))) {
  const emulator = tool('emulator', process.platform === 'win32' ? 'emulator.exe' : 'emulator');
  const avd = process.env.AVD ?? output(`"${emulator}" -list-avds`).split(/\r?\n/)[0];
  console.log(`Démarrage de l'émulateur ${avd}…`);
  spawn(emulator, ['-avd', avd, '-no-snapshot-save', '-no-boot-anim'], {
    detached: true,
    stdio: 'ignore',
  }).unref();
  await waitForBoot();
}

// Les scénarios lisent les textes en français et l'app suit la langue du téléphone.
const french = () => output(`${adb} shell getprop persist.sys.locale`).startsWith('fr');
if (!french()) {
  console.log("Passage de l'émulateur en français…");
  // Android récent : sans root ni redémarrage.
  try {
    output(`${adb} shell cmd locale set-device-locale fr-FR`);
  } catch {}
  if (!french()) {
    // Android plus ancien : il faut root (image « Google APIs », pas « Google Play »).
    try {
      run(`${adb} root`);
      run(`${adb} wait-for-device`);
      run(`${adb} shell setprop persist.sys.locale fr-FR`);
    } catch {
      throw new Error(
        "Impossible de passer l'émulateur en français sans root : choisissez Français dans " +
          'Paramètres > Système > Langues, ou utilisez une image « Google APIs ».',
      );
    }
    const previousBoot = bootId();
    run(`${adb} reboot`);
    await waitForBoot(previousBoot);
  }
}

// Seule l'architecture de l'émulateur est construite : 4 fois plus rapide.
// Sous Windows, certains chemins du build C++ dépassent 260 caractères : il faut les chemins
// longs activés et ninja ≥ 1.12 dans Android/Sdk/cmake/<version>/bin (1.10 fourni avec 3.22.1).
const abi = output(`${adb} shell getprop ro.product.cpu.abi`).trim();
run('npx expo run:android --variant release --no-bundler', {
  env: { ...process.env, ORG_GRADLE_PROJECT_reactNativeArchitectures: abi },
});

run(`maestro test ${flows.length ? flows.map((f) => `"${f}"`).join(' ') : '.maestro'}`);
