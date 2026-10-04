import { userEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

// Les écrans eux-mêmes sont testés à part : ici seule la navigation compte.
jest.mock('../src/app/(tabs)/index', () => {
  const { Text } = jest.requireActual('react-native');
  return { __esModule: true, default: () => <Text>Écran Météo</Text> };
});

describe('Navigation par onglets', () => {
  it("ouvre l'onglet Météo puis passe à Villes, l'onglet actif étant sélectionné", async () => {
    const user = userEvent.setup();
    await renderRouter('./src/app');

    expect(await screen.findByText('Écran Météo')).toBeOnTheScreen();
    expect(screen.getByTestId('onglet-meteo')).toBeSelected();
    expect(screen.getByTestId('onglet-villes')).not.toBeSelected();

    await user.press(screen.getByTestId('onglet-villes'));

    expect(await screen.findByText('Bientôt : vos villes favorites.')).toBeOnTheScreen();
    expect(screen.getByTestId('onglet-villes')).toBeSelected();
    expect(screen.getByTestId('onglet-meteo')).not.toBeSelected();
  });
});
