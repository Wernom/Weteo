import { userEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import { StyleSheet } from 'react-native';

import { PALETTES, tabBarTheme } from '../src/theme';

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

    expect(await screen.findByLabelText('Nom de la ville')).toBeOnTheScreen();
    expect(screen.getByTestId('onglet-villes')).toBeSelected();
    expect(screen.getByTestId('onglet-meteo')).not.toBeSelected();
  });

  it("passe à l'onglet Réglages", async () => {
    const user = userEvent.setup();
    await renderRouter('./src/app');

    await user.press(await screen.findByTestId('onglet-reglages'));

    expect(await screen.findByText('Langue')).toBeOnTheScreen();
    expect(screen.getByTestId('onglet-reglages')).toBeSelected();
    expect(screen.getByTestId('onglet-meteo')).not.toBeSelected();
  });

  it('la barre garde le fond de la page Météo affichée sur les autres onglets', async () => {
    const user = userEvent.setup();
    tabBarTheme.write('pluie');
    await renderRouter('./src/app');

    await user.press(await screen.findByTestId('onglet-reglages'));

    // La barre est l'ancêtre du bouton qui porte un fond.
    let bar = screen.getByTestId('onglet-reglages').parent;
    while (bar && !StyleSheet.flatten(bar.props.style)?.backgroundColor) bar = bar.parent;
    expect(StyleSheet.flatten(bar?.props.style).backgroundColor).toBe(
      PALETTES.light.gradients.pluie[2],
    );
  });
});
