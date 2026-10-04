import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';

import DayScreen from '../src/app/jour/[date]';
import { cityQueryKey, fetchForecast, WEATHER_QUERY_KEY } from '../src/weather';
import forecastFixture from '../__fixtures__/open-meteo-forecast.json';

jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    useLocalSearchParams: jest.fn(),
    Redirect: ({ href }: { href: string }) => <Text>Redirection vers {href}</Text>,
    Stack: {
      Screen: ({ options }: { options: { title: string } }) => <Text>{options.title}</Text>,
    },
  };
});

async function renderDay(date: string, { cached = true, ville = '' } = {}) {
  jest.mocked(useLocalSearchParams).mockReturnValue(ville ? { date, ville } : { date });
  // gcTime infini : sinon le cache arme un minuteur de 5 min qui retient le worker Jest.
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  if (cached) {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: true, json: async () => forecastFixture } as Response);
    client.setQueryData(ville ? cityQueryKey(ville) : WEATHER_QUERY_KEY, {
      forecast: await fetchForecast(48.85, 2.35),
      place: 'Paris',
    });
  }
  return render(
    <QueryClientProvider client={client}>
      <DayScreen />
    </QueryClientProvider>,
  );
}

describe('Écran Détail du jour', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('affiche la courbe, les précipitations et le lever et coucher du soleil du jour', async () => {
    await renderDay('2026-10-06');

    expect(screen.getByText('Mardi')).toBeOnTheScreen();
    expect(screen.getByText('Couvert')).toBeOnTheScreen();
    expect(screen.getByText('10° / 17°')).toBeOnTheScreen();
    expect(screen.getByTestId('courbe-temperatures')).toHaveAccessibleName(
      'Minimum 8° à 3 h, maximum 16° à 15 h',
    );
    expect(screen.getByText('Précipitations 0 mm · 10 %')).toBeOnTheScreen();
    expect(screen.getByText('Lever 08:00')).toBeOnTheScreen();
    expect(screen.getByText('Coucher 19:19')).toBeOnTheScreen();
  });

  it("affiche l'heure et la température là où on touche la courbe, et suit le doigt", async () => {
    await renderDay('2026-10-06');
    const chart = screen.getByTestId('courbe-temperatures');
    // Zone tactile de 280 px : gouttière de 34 px à gauche, 12 px à droite → 10 px par heure.
    await fireEvent(chart, 'layout', { nativeEvent: { layout: { width: 280, height: 190 } } });

    expect(screen.getByText('Touchez la courbe pour le détail heure par heure.')).toBeOnTheScreen();

    await fireEvent(chart, 'responderGrant', { nativeEvent: { locationX: 34 + 150 } });
    expect(screen.getByText('15 h · 16°')).toBeOnTheScreen();
    expect(chart).toHaveAccessibilityValue({ text: '15 h, 16°' });

    await fireEvent(chart, 'responderMove', { nativeEvent: { locationX: 34 + 32 } });
    expect(screen.getByText('3 h · 8°')).toBeOnTheScreen();

    // Hors de la courbe : on reste sur la première ou la dernière heure.
    await fireEvent(chart, 'responderMove', { nativeEvent: { locationX: 0 } });
    expect(screen.getByText('0 h · 9°')).toBeOnTheScreen();
    await fireEvent(chart, 'responderMove', { nativeEvent: { locationX: 280 } });
    expect(screen.getByText('23 h · 10°')).toBeOnTheScreen();
  });

  it('parcourt les heures avec le lecteur d’écran (geste ajuster)', async () => {
    await renderDay('2026-10-06');
    const chart = screen.getByTestId('courbe-temperatures');
    await fireEvent(chart, 'layout', { nativeEvent: { layout: { width: 280, height: 190 } } });

    await fireEvent(chart, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(chart).toHaveAccessibilityValue({ text: '0 h, 9°' });
    await fireEvent(chart, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(chart).toHaveAccessibilityValue({ text: '1 h, 9°' });
    await fireEvent(chart, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    expect(chart).toHaveAccessibilityValue({ text: '0 h, 9°' });
  });

  it("titre « Aujourd'hui » pour le premier jour, cumul décimal à la française", async () => {
    await renderDay('2026-10-05');

    expect(screen.getByText("Aujourd'hui")).toBeOnTheScreen();
    expect(screen.getByText('Précipitations 2,4 mm · 80 %')).toBeOnTheScreen();
  });

  it("lit la météo de la ville quand on vient de l'écran d'une ville", async () => {
    await renderDay('2026-10-06', { ville: '2996944' });

    expect(screen.getByText('Mardi')).toBeOnTheScreen();
    expect(screen.getByText('10° / 17°')).toBeOnTheScreen();
  });

  it("revient à l'écran Météo sans météo en cache", async () => {
    await renderDay('2026-10-06', { cached: false });

    expect(screen.getByText('Redirection vers /')).toBeOnTheScreen();
  });
});
