import Storage from 'expo-sqlite/kv-store';

// Textes prêts comme dans l'app, où le layout racine l'importe : les tests rendent les écrans seuls.
import '../src/i18n';

// Chaque test repart de zéro, même s'il échoue : espions restaurés, stockage vidé.
afterEach(() => {
  jest.restoreAllMocks();
  Storage.clearSync();
});

// Localisation pour Jest : chaque test choisit ses réponses avec jest.mocked(Location).
jest.mock('../modules/weteo-location', () => ({
  __esModule: true,
  default: {
    requestForegroundPermissionsAsync: jest.fn(),
    getLastKnownPositionAsync: jest.fn(),
    getCurrentPositionAsync: jest.fn(),
    reverseGeocodeAsync: jest.fn(),
  },
}));
