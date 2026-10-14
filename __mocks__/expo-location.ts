// Localisation pour Jest : chaque test choisit ses réponses avec jest.mocked(Location).
export const Accuracy = { Balanced: 3 };
export const requestForegroundPermissionsAsync = jest.fn();
export const getLastKnownPositionAsync = jest.fn();
export const getCurrentPositionAsync = jest.fn();
export const reverseGeocodeAsync = jest.fn();
