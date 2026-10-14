import { QueryClient } from '@tanstack/react-query';

import forecastFixture from '../__fixtures__/open-meteo-forecast.json';
import type { City } from '../src/weather';

// Sans nouvel essai. gcTime infini : sinon le cache arme un minuteur de 5 min qui retient le worker Jest.
export const newClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });

// Réponse réussie de fetch, de corps JSON `json`.
export const respond = (json: unknown) => ({ ok: true, json: async () => json }) as Response;

// fetch renvoie toujours `response` : par défaut, les prévisions du fixture.
export const mockFetch = (response: Partial<Response> = respond(forecastFixture)) =>
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(response as Response);

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
