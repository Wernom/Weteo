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

jest.mock('../modules/weteo-notifications', () => ({
  __esModule: true,
  default: { requestPermissionsAsync: jest.fn(), notify: jest.fn() },
}));

// WorkManager absent sous Jest : chaque test vérifie l'enregistrement de la tâche des alertes pluie.
jest.mock('expo-background-task', () => ({
  ...jest.requireActual('expo-background-task'),
  registerTaskAsync: jest.fn(),
  unregisterTaskAsync: jest.fn(),
}));

// Un widget posé par défaut : chaque test le retire avec jest.mocked(Widget).
jest.mock('../modules/weteo-widget', () => ({
  __esModule: true,
  default: { update: jest.fn(), hasWidgets: jest.fn(() => true) },
}));

jest.mock('../modules/weteo-icon', () => ({
  __esModule: true,
  default: { setIcon: jest.fn() },
}));

// Carte native absente sous Jest : des vues qui portent leurs props. `flyTo` est partagé par toutes
// les caméras, pour que les tests vérifient les déplacements.
jest.mock('@maplibre/maplibre-react-native', () => {
  const { createElement, useImperativeHandle } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const flyTo = jest.fn();
  return {
    flyTo,
    Map: (props: object) => createElement(View, props),
    Camera: ({ ref, ...props }: { ref: unknown }) => {
      useImperativeHandle(ref, () => ({ flyTo }));
      return createElement(View, { testID: 'camera', ...props });
    },
    RasterSource: (props: object) => createElement(View, { testID: 'radar-source', ...props }),
    Layer: (props: object) => createElement(View, { testID: 'radar-couche', ...props }),
  };
});
