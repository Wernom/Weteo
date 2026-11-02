import Storage from 'expo-sqlite/kv-store';

import pluie from '../__fixtures__/open-meteo-minutely-pluie.json';
import { LYON, mockFetch, NICE, respond } from '../jest/helpers';
import Location from '../modules/weteo-location';
import Notifications from '../modules/weteo-notifications';
import fr from '../src/locales/fr.json';
import { checkRain, rainClient, rainRule } from '../src/rainAlert';

const location = jest.mocked(Location);
const notify = jest.mocked(Notifications.notify);

// Les mêmes tranches, toutes sèches.
const sec = {
  minutely_15: { time: pluie.minutely_15.time, precipitation: pluie.minutely_15.time.map(() => 0) },
};
const slots = (precipitation: number[]) =>
  precipitation.map((p, i) => ({ time: pluie.minutely_15.time[i], precipitation: p }));

const enable = (settings: object = {}) =>
  Storage.setItemSync('reglages', JSON.stringify({ rainAlerts: true, ...settings }));
const gps = (coords: { latitude: number; longitude: number } | null) =>
  location.getLastKnownPositionAsync.mockResolvedValue(coords && { coords });

// Vérification suivante, 15 min plus tard : la réponse précédente n'est plus en cache.
async function nextCheck(response: object) {
  rainClient.clear();
  const fetchMock = mockFetch(respond(response));
  await checkRain();
  return fetchMock;
}

afterEach(() => {
  rainClient.clear();
  jest.clearAllMocks();
});

describe('Règle de déclenchement', () => {
  it('annonce la première tranche de pluie', () => {
    expect(rainRule(slots([0, 0, 0.4, 1.2]), false)).toEqual({
      notifyAt: '2026-11-02T14:30',
      alerted: true,
    });
  });

  it('ignore quelques gouttes sous 0,1 mm', () => {
    expect(rainRule(slots([0, 0.05, 0]), false)).toEqual({ notifyAt: null, alerted: false });
  });

  it("n'annonce pas deux fois le même épisode", () => {
    expect(rainRule(slots([0.4, 1.2]), true)).toEqual({ notifyAt: null, alerted: true });
  });

  it("clôt l'épisode quand les 2 heures à venir sont sèches", () => {
    expect(rainRule(slots([0, 0, 0]), true)).toEqual({ notifyAt: null, alerted: false });
  });
});

describe('Être prévenu avant la pluie', () => {
  it("prévient quand la pluie arrive à ma position, avec l'heure", async () => {
    enable();
    gps(LYON);

    const fetchMock = await nextCheck(pluie);

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain(`latitude=${LYON.latitude}`);
    expect(url).toContain('minutely_15=precipitation');
    expect(notify).toHaveBeenCalledWith(
      fr.reglages.alertesPluie,
      fr.alertePluie.titre,
      'Pluie prévue vers 14:45.',
    );
  });

  it('ne prévient pas sans pluie', async () => {
    enable();
    gps(LYON);

    await nextCheck(sec);

    expect(notify).not.toHaveBeenCalled();
  });

  it('prévient une seule fois par épisode, puis de nouveau après une éclaircie', async () => {
    enable();
    gps(LYON);

    await nextCheck(pluie);
    await nextCheck(pluie);
    expect(notify).toHaveBeenCalledTimes(1);

    await nextCheck(sec);
    await nextCheck(pluie);
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it('surveille le favori choisi quand la position est inconnue', async () => {
    enable({ rainAlertCity: NICE.id });
    Storage.setItemSync('favoris', JSON.stringify([LYON, NICE]));
    gps(null);

    const fetchMock = await nextCheck(pluie);

    expect(String(fetchMock.mock.calls[0][0])).toContain(`latitude=${NICE.latitude}`);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('ne vérifie rien sans position ni favori choisi', async () => {
    enable();
    gps(null);

    const fetchMock = await nextCheck(pluie);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it('ne vérifie rien si les alertes sont coupées', async () => {
    gps(LYON);

    const fetchMock = await nextCheck(pluie);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
