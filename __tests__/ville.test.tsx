import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';

import CityScreen from '../src/app/ville/[id]';
import { LYON, mockFetch, newClient } from '../jest/helpers';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useLocalSearchParams: jest.fn(),
  // Seul le bouton de droite de l'en-tête nous intéresse.
  Stack: { Screen: ({ options }: any) => options.headerRight?.() ?? null },
}));

async function renderCity() {
  jest.mocked(useLocalSearchParams).mockReturnValue({
    id: String(LYON.id),
    city: JSON.stringify(LYON),
  });
  const fetchMock = mockFetch();
  await render(
    <QueryClientProvider client={newClient()}>
      <CityScreen />
    </QueryClientProvider>,
  );
  return fetchMock;
}

describe("Écran Météo d'une ville", () => {
  it('affiche la météo de la ville sans demander la localisation', async () => {
    const fetchMock = await renderCity();

    expect(await screen.findByText('Lyon')).toBeOnTheScreen();
    expect(screen.getByText('18°')).toBeOnTheScreen();
    expect(screen.getByText('Prévisions sur 7 jours')).toBeOnTheScreen();
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/latitude=45\.74906&longitude=4\.84789/);
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('toucher un jour ouvre le détail de ce jour pour la ville', async () => {
    await renderCity();
    const user = userEvent.setup();

    await user.press(await screen.findByTestId('jour-1'));

    expect(router.push).toHaveBeenCalledWith('/jour/2026-10-06?ville=2996944');
  });

  it("l'étoile de l'en-tête ajoute la ville aux favoris, puis l'en retire", async () => {
    await renderCity();
    const user = userEvent.setup();
    const star = screen.getByTestId('etoile-ville');
    expect(star).toHaveAccessibleName('Ajouter Lyon aux favoris');

    await user.press(star);

    expect(JSON.parse(Storage.getItemSync('favoris')!)).toEqual([LYON]);
    expect(screen.getByTestId('etoile-ville')).toHaveAccessibleName('Retirer Lyon des favoris');

    await user.press(screen.getByTestId('etoile-ville'));

    expect(JSON.parse(Storage.getItemSync('favoris')!)).toEqual([]);
    await screen.findByText('Lyon');
  });
});
