import { render, screen, userEvent } from '@testing-library/react-native';

import { ErrorBoundary } from '../src/ErrorScreen';

describe('ErrorBoundary', () => {
  it('affiche un message compréhensible et relance le rendu avec « Réessayer »', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const retry = jest.fn(async () => {});
    const user = userEvent.setup();

    await render(
      <ErrorBoundary
        error={new TypeError("undefined is not an object ('current')")}
        retry={retry}
      />,
    );

    expect(screen.getByText('Une erreur inattendue est survenue.')).toBeOnTheScreen();
    expect(screen.queryByText(/undefined is not an object/)).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Réessayer' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
