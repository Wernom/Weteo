import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import CitiesScreen from '../src/app/(tabs)/villes';
import geocodingFixture from '../__fixtures__/open-meteo-geocoding.json';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

function mockApi(response: Partial<Response>) {
  return jest.spyOn(globalThis, 'fetch').mockResolvedValue(response as Response);
}

async function search(text: string) {
  const user = userEvent.setup();
  await render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}
    >
      <CitiesScreen />
    </QueryClientProvider>,
  );
  await user.type(screen.getByLabelText('Nom de la ville'), text);
  // Laisse passer la pause de 300 ms après la frappe.
  await act(() => new Promise((resolve) => setTimeout(resolve, 300)));
  return user;
}

describe('Écran Villes', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('affiche les villes trouvées avec leur région et leur pays', async () => {
    const fetchMock = mockApi({ ok: true, json: async () => geocodingFixture });

    await search('Lyon');

    expect(await screen.findByText('Rhône-Alpes, France')).toBeOnTheScreen();
    expect(screen.getByText('Mississippi, États-Unis')).toBeOnTheScreen();
    expect(screen.getByTestId('ville-2')).toHaveAccessibleName('Lyon, Missouri, États-Unis');
    // Une seule requête, une fois la frappe terminée.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/[?&]name=Lyon&.*language=fr/);
  });

  it("dit clairement qu'aucune ville n'est trouvée", async () => {
    mockApi({ ok: true, json: async () => ({ generationtime_ms: 0.2 }) });

    await search('zzqxwv');

    expect(
      await screen.findByText("Aucune ville trouvée pour « zzqxwv ». Vérifiez l'orthographe."),
    ).toBeOnTheScreen();
  });

  it("n'interroge pas l'API pour une seule lettre", async () => {
    const fetchMock = mockApi({ ok: true, json: async () => geocodingFixture });

    await search('L');

    expect(screen.getByText('Tapez au moins 2 lettres.')).toBeOnTheScreen();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("propose de réessayer quand l'API est en erreur, puis affiche les villes", async () => {
    const fetchMock = mockApi({ ok: false, status: 503 });

    const user = await search('Lyon');
    expect(await screen.findByText('Open-Meteo a répondu 503')).toBeOnTheScreen();

    fetchMock.mockResolvedValue({ ok: true, json: async () => geocodingFixture } as Response);
    await user.press(screen.getByText('Réessayer'));

    expect(await screen.findByText('Rhône-Alpes, France')).toBeOnTheScreen();
  });

  it('toucher une ville ouvre sa météo', async () => {
    mockApi({ ok: true, json: async () => geocodingFixture });

    const user = await search('Lyon');
    await user.press(await screen.findByTestId('ville-0'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/ville/[id]',
      params: { id: '2996944', name: 'Lyon', latitude: '45.74906', longitude: '4.84789' },
    });
  });
});
