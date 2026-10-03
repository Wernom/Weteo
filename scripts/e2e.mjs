// Lance les tests Maestro de bout en bout : démarre l'émulateur si besoin,
// construit et installe l'APK release, puis joue les flows de .maestro.
import { execSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const run = (cmd, options) => execSync(cmd, { stdio: 'inherit', ...options });
const output = (cmd) => execSync(cmd, { encoding: 'utf8' });
const tool = (dir, name) =>
  process.env.ANDROID_HOME ? path.join(process.env.ANDROID_HOME, dir, name) : name;
const adb = `"${tool('platform-tools', 'adb')}"`;

if (!/\tdevice\b/.test(output(`${adb} devices`))) {
  const emulator = tool('emulator', process.platform === 'win32' ? 'emulator.exe' : 'emulator');
  const avd = process.env.AVD ?? output(`"${emulator}" -list-avds`).split(/\r?\n/)[0];
  console.log(`Démarrage de l'émulateur ${avd}…`);
  spawn(emulator, ['-avd', avd, '-no-snapshot-save', '-no-boot-anim'], {
    detached: true,
    stdio: 'ignore',
  }).unref();
  run(`${adb} wait-for-device`, { timeout: 180_000 });
  const booted = () => {
    try {
      return output(`${adb} shell getprop sys.boot_completed`).trim() === '1';
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

let cwd = process.cwd();
let drive;
if (process.platform === 'win32') {
  // ponytail: certains chemins du build C++ dépassent 260 caractères sous Windows ;
  // on construit depuis un lecteur virtuel court. À retirer si les chemins longs sont activés.
  drive = ['W:', 'V:', 'U:', 'T:'].find((d) => !existsSync(`${d}/`));
  if (!drive) throw new Error('Aucune lettre de lecteur libre parmi W:, V:, U:, T:.');
  run(`subst ${drive} "${path.dirname(cwd)}"`);
  cwd = path.join(`${drive}/`, path.basename(cwd));
}
try {
  run('npx expo run:android --variant release --no-bundler', { cwd });
} finally {
  if (drive) run(`subst ${drive} /D`);
}

run('maestro test .maestro');
