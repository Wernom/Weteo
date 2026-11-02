import { QueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';

import { LYON, mockFetch } from '../../jest/helpers';
import WeteoIcon from '../../modules/weteo-icon';
import Location from '../../modules/weteo-location';
import { refreshAppIcon, syncAppIcon, weatherIcon } from '../appIcon';
import { setSetting } from '../settings';
import { WEATHER_QUERY_KEY } from '../weather';

describe('weatherIcon', () => {
  it.each([
    [[0, 1], true, 'soleil'],
    [[0, 1], false, 'nuit'],
    [[2, 3, 45, 48], true, 'nuages'],
    [[2, 3, 45, 48], false, 'nuages'],
    [[51, 55, 61, 67, 80, 82], true, 'pluie'],
    [[71, 77, 85, 86], false, 'neige'],
    [[95, 96, 99], true, 'orage'],
  ])('codes %j, jour %s → %s', (codes, isDay, icon) => {
    for (const code of codes) expect(weatherIcon(code, isDay)).toBe(icon);
  });
});

describe('syncAppIcon', () => {
  // Passe l'app dans `state` après avoir branché la synchro sur une météo donnée.
  function goTo(state: string, current?: { weatherCode: number; isDay: boolean }) {
    const client = new QueryClient();
    if (current) client.setQueryData(WEATHER_QUERY_KEY, { forecast: { current }, place: null });
    const listen = jest.spyOn(AppState, 'addEventListener');
    syncAppIcon(client);
    (listen.mock.lastCall![1] as (state: string) => void)(state);
  }

  beforeEach(() => {
    setSetting('weatherIcon', true);
    jest.mocked(WeteoIcon.setIcon).mockClear();
  });

  it("change l'icône au passage en arrière-plan", () => {
    goTo('background', { weatherCode: 61, isDay: true });
    expect(WeteoIcon.setIcon).toHaveBeenCalledWith('pluie');
  });

  it("ne touche à rien quand l'app reste au premier plan", () => {
    goTo('active', { weatherCode: 61, isDay: true });
    expect(WeteoIcon.setIcon).not.toHaveBeenCalled();
  });

  it("garde l'icône tant que la météo n'est pas connue", () => {
    goTo('background');
    expect(WeteoIcon.setIcon).not.toHaveBeenCalled();
  });

  it('revient au soleil quand le réglage est coupé', () => {
    setSetting('weatherIcon', false);
    goTo('background', { weatherCode: 61, isDay: true });
    expect(WeteoIcon.setIcon).toHaveBeenCalledWith('soleil');
  });
});

describe('refreshAppIcon', () => {
  const location = jest.mocked(Location);

  beforeEach(() => {
    setSetting('weatherIcon', true);
    jest.clearAllMocks();
  });

  it('suit la météo de la dernière position connue', async () => {
    location.getLastKnownPositionAsync.mockResolvedValue({ coords: LYON });
    const fetchMock = mockFetch();

    await refreshAppIcon();

    expect(String(fetchMock.mock.calls[0][0])).toContain(`latitude=${LYON.latitude}`);
    // Fixture : pluie (code 61).
    expect(WeteoIcon.setIcon).toHaveBeenCalledWith('pluie');
  });

  it('ne fait rien quand le réglage est coupé', async () => {
    setSetting('weatherIcon', false);
    location.getLastKnownPositionAsync.mockResolvedValue({ coords: LYON });
    const fetchMock = mockFetch();

    await refreshAppIcon();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(WeteoIcon.setIcon).not.toHaveBeenCalled();
  });

  it('ne fait rien sans position connue', async () => {
    location.getLastKnownPositionAsync.mockResolvedValue(null);
    const fetchMock = mockFetch();

    await refreshAppIcon();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(WeteoIcon.setIcon).not.toHaveBeenCalled();
  });
});
