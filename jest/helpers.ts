import { QueryClient } from '@tanstack/react-query';

import airQualityFixture from '../__fixtures__/open-meteo-air-quality.json';
import forecastFixture from '../__fixtures__/open-meteo-forecast.json';
import type { City } from '../src/weather';

// Sans nouvel essai. gcTime infini : sinon le cache arme un minuteur de 5 min qui retient le worker Jest.
export const newClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });

// Réponse réussie de fetch, de corps JSON `json`.
export const respond = (json: unknown) => ({ ok: true, json: async () => json }) as Response;

// fetch renvoie toujours `response`. Par défaut, les fixtures : prévisions et qualité de l'air.
// Une réponse donnée sert aussi à l'appel de l'air, qui l'écarte : la météo s'affiche sans l'air.
export const mockFetch = (response?: Partial<Response>) =>
  jest
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (url) =>
      response
        ? (response as Response)
        : respond(String(url).includes('air-quality') ? airQualityFixture : forecastFixture),
    );

// Les appels de prévisions seuls : chaque chargement de la météo appelle aussi l'air.
export const forecastCalls = (fetchMock: jest.SpyInstance) =>
  fetchMock.mock.calls.filter(([url]) => String(url).includes('/v1/forecast'));

export const LYON: City = {
  id: 2996944,
  name: 'Lyon',
  region: 'Rhône-Alpes',
  country: 'France',
  latitude: 45.74906,
  longitude: 4.84789,
};

export const NICE: City = {
  id: 2990440,
  name: 'Nice',
  region: "Provence-Alpes-Côte d'Azur",
  country: 'France',
  latitude: 43.70313,
  longitude: 7.26608,
};
