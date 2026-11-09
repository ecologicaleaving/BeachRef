import React from 'react';
import { cleanupAsync, fireEvent, renderAsync, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import Accedi from '../../app/accedi';
import Iscrizione from '../../app/iscrizione';
import { completaRitorno, entraConGoogle, esci, statoAccesso } from '../../services/auth/AccessService';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock('../../services/auth/AccessService', () => ({
  completaRitorno: jest.fn(), entraConGoogle: jest.fn(), esci: jest.fn(), statoAccesso: jest.fn(),
}));

const routes = [
  { name: 'sign in', Component: Accedi, googleButton: 'Sign in with Google', callback: '/accedi' },
  { name: 'registration', Component: Iscrizione, googleButton: 'Sign up with Google', callback: '/iscrizione' },
];

beforeEach(() => {
  jest.clearAllMocks();
  (completaRitorno as jest.Mock).mockReset().mockResolvedValue(null);
  (statoAccesso as jest.Mock).mockReset().mockResolvedValue({ stato: 'anonimo' });
  (entraConGoogle as jest.Mock).mockReset().mockResolvedValue(undefined);
  (esci as jest.Mock).mockReset().mockResolvedValue(undefined);
});
afterEach(cleanupAsync);

describe.each(routes)('$name page', ({ Component, googleButton, callback }) => {
  it('lets an anonymous visitor start Google immediately without an invitation code', async () => {
    await renderAsync(React.createElement(Component));
    const button = screen.getByText(googleButton);
    fireEvent.press(button);
    await waitFor(() => expect(entraConGoogle).toHaveBeenCalledWith(callback));
  });

  it('finishes the OAuth callback before reading access and redirects an authenticated user to statistics', async () => {
    let exchanged = false;
    (completaRitorno as jest.Mock).mockImplementation(async () => { exchanged = true; return null; });
    (statoAccesso as jest.Mock).mockImplementation(async () => {
      expect(exchanged).toBe(true);
      return { stato: 'autorizzato', email: 'new@example.com', nome: 'New User' };
    });
    await renderAsync(React.createElement(Component));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/referee-stats-lab'));
  });

  it('shows a thrown callback error and lets the visitor restart Google instead of leaving a spinner', async () => {
    (completaRitorno as jest.Mock).mockRejectedValue(new Error('Callback network failure'));
    await renderAsync(React.createElement(Component));
    await screen.findByText('Callback network failure');
    fireEvent.press(await screen.findByText(googleButton));
    await waitFor(() => expect(entraConGoogle).toHaveBeenCalledWith(callback));
  });

  it('shows provider cancellation and keeps sign in available', async () => {
    (completaRitorno as jest.Mock).mockResolvedValue('access_denied: Cancelled');
    await renderAsync(React.createElement(Component));
    await screen.findByText('access_denied: Cancelled');
    fireEvent.press(await screen.findByText(googleButton));
    await waitFor(() => expect(entraConGoogle).toHaveBeenCalledWith(callback));
  });

  it('reenables the Google action after a provider startup failure', async () => {
    (entraConGoogle as jest.Mock).mockRejectedValueOnce(new Error('Google unavailable')).mockResolvedValueOnce(undefined);
    await renderAsync(React.createElement(Component));
    fireEvent.press(await screen.findByText(googleButton));
    await screen.findByText('Google unavailable');
    fireEvent.press(await screen.findByText(googleButton));
    await waitFor(() => expect(entraConGoogle).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText('Google unavailable')).toBeNull());
  });

  it('fails closed during a deployment mismatch and can retry the server check', async () => {
    (statoAccesso as jest.Mock)
      .mockResolvedValueOnce({ stato: 'autenticato_non_autorizzato', email: 'new@example.com' })
      .mockResolvedValueOnce({ stato: 'autorizzato', email: 'new@example.com', nome: 'New User' });
    await renderAsync(React.createElement(Component));
    const retry = await screen.findByText('Try again');
    expect(router.replace).not.toHaveBeenCalled();
    fireEvent.press(retry);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/referee-stats-lab'));
  });
});

it('links account creation directly from the anonymous sign-in page', async () => {
  await renderAsync(React.createElement(Accedi));
  fireEvent.press(await screen.findByText('Create account'));
  expect(router.push).toHaveBeenCalledWith('/iscrizione');
});
