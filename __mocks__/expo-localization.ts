// Téléphone en français pour Jest ; un test peut changer la langue avec jest.mocked(getLocales).
export const getLocales = jest.fn(() => [{ languageTag: 'fr-FR', languageCode: 'fr' }]);
