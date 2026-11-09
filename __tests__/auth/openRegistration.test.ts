import type * as Access from '../../services/auth/AccessService';

const originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const originalKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
let api: typeof Access;
let remembered: typeof import('../../services/auth/statoRicordato');
let sdk: {
  auth: { getSession: jest.Mock; exchangeCodeForSession: jest.Mock; signInWithOAuth: jest.Mock; signOut: jest.Mock };
  rpc: jest.Mock;
  from: jest.Mock;
};
let createClient: jest.Mock;
let session: { access_token: string; user: { id: string; email: string; user_metadata: { full_name: string } } } | null;

function browserAt(relative: string) {
  const url = new URL(relative, 'https://beachref.example');
  const location = { origin: url.origin, pathname: url.pathname, search: url.search, hash: url.hash };
  const replaceState = jest.fn((_state, _title, next) => {
    const clean = new URL(String(next), url.origin);
    Object.assign(location, { pathname: clean.pathname, search: clean.search, hash: clean.hash });
  });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { location, history: { replaceState } } });
  return { location, replaceState };
}

beforeEach(async () => {
  jest.resetModules();
  delete (globalThis as { window?: unknown }).window;
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://beachref.example';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-public-key';
  session = { access_token: 'test-session-token', user: { id: 'new-user', email: 'new@example.com', user_metadata: { full_name: 'New User' } } };
  sdk = {
    auth: {
      getSession: jest.fn(async () => ({ data: { session }, error: null })),
      exchangeCodeForSession: jest.fn(async () => ({ error: null })),
      signInWithOAuth: jest.fn(async () => ({ error: null })),
      signOut: jest.fn(async () => { session = null; return { error: null }; }),
    },
    rpc: jest.fn(async () => ({ data: true, error: null })),
    from: jest.fn(() => { throw new Error('Account registration must not query legacy membership tables'); }),
  };
  createClient = jest.fn(() => sdk);
  jest.doMock('@supabase/supabase-js', () => ({ createClient }));
  api = await import('../../services/auth/AccessService');
  remembered = await import('../../services/auth/statoRicordato');
  await remembered.dimentica();
});

afterAll(() => {
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  else process.env.EXPO_PUBLIC_SUPABASE_URL = originalUrl;
  if (originalKey === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  else process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = originalKey;
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else delete (globalThis as { window?: unknown }).window;
});

describe('open registration and server-authoritative statistics access', () => {
  it('accepts a newly provisioned OAuth identity without legacy membership or invite redemption', async () => {
    await expect(api.statoAccesso()).resolves.toEqual({ stato: 'autorizzato', email: 'new@example.com', nome: 'New User' });
    expect(sdk.rpc).toHaveBeenCalledWith('is_authorized');
    expect(sdk.rpc).toHaveBeenCalledTimes(1);
    expect(sdk.from).not.toHaveBeenCalled();
    expect(await remembered.statoRicordato()).toEqual({ stato: 'autorizzato', email: 'new@example.com' });
    await expect(api.tokenCorrente()).resolves.toBe('test-session-token');
  });

  it('keeps anonymous visitors out without invoking the authorization RPC', async () => {
    session = null;
    await expect(api.statoAccesso()).resolves.toEqual({ stato: 'anonimo' });
    await expect(api.tokenCorrente()).resolves.toBeNull();
    expect(sdk.rpc).not.toHaveBeenCalled();
    expect((await remembered.statoRicordato())?.stato).toBe('anonimo');
  });

  it.each([
    { data: false, error: null },
    { data: null, error: { message: 'RPC is not deployed yet' } },
    { data: true, error: { message: 'Permission check failed' } },
  ])('fails closed if the server denies access or the deployment is incomplete: %j', async result => {
    sdk.rpc.mockResolvedValue(result);
    await expect(api.statoAccesso()).resolves.toEqual({ stato: 'autenticato_non_autorizzato', email: 'new@example.com' });
    expect((await remembered.statoRicordato())?.stato).toBe('autenticato_non_autorizzato');
  });

  it('clears the remembered menu state before signing out and returns to anonymous access', async () => {
    await api.statoAccesso();
    sdk.auth.signOut.mockImplementation(async () => {
      expect(await remembered.statoRicordato()).toBeNull();
      session = null;
      return { error: null };
    });
    await api.esci();
    expect(sdk.auth.signOut).toHaveBeenCalledTimes(1);
    await expect(api.statoAccesso()).resolves.toEqual({ stato: 'anonimo' });
    await expect(api.tokenCorrente()).resolves.toBeNull();
  });
});

describe('explicit Google PKCE flow', () => {
  it('starts free registration without an invitation while keeping isolated PKCE storage', async () => {
    browserAt('/iscrizione?invito=expired-legacy-code');
    await api.entraConGoogle('/iscrizione');
    expect(sdk.auth.signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: 'https://beachref.example/iscrizione' } });
    const options = createClient.mock.calls[0]![2];
    expect(options.auth).toMatchObject({ flowType: 'pkce', detectSessionInUrl: false, persistSession: true, storageKey: 'sb-beachref-accesso' });
  });

  it('exchanges the code once, keeps legacy links harmless, and makes the resulting session available', async () => {
    const browser = browserAt('/iscrizione?invito=expired&code=oauth-code&state=opaque');
    await expect(api.completaRitorno()).resolves.toBeNull();
    await expect(api.completaRitorno()).resolves.toBeNull();
    expect(sdk.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
    expect(sdk.auth.exchangeCodeForSession).toHaveBeenCalledWith('oauth-code');
    expect(browser.location.search).toBe('?invito=expired');
    await expect(api.statoAccesso()).resolves.toMatchObject({ stato: 'autorizzato' });
    expect(sdk.rpc).not.toHaveBeenCalledWith('redeem_invite', expect.anything());
  });

  it('surfaces code-exchange errors, cleans the consumed code and allows another Google attempt', async () => {
    const browser = browserAt('/accedi?code=bad-code&state=opaque');
    sdk.auth.exchangeCodeForSession.mockResolvedValue({ error: { message: 'Code verifier missing' } });
    await expect(api.completaRitorno()).resolves.toBe('Code verifier missing');
    expect(browser.location.search).toBe('');
    await api.entraConGoogle('/accedi');
    expect(sdk.auth.signInWithOAuth).toHaveBeenCalledTimes(1);
  });

  it.each(['/iscrizione?error=access_denied&error_description=Cancelled', '/accedi#error=access_denied&error_description=Cancelled'])('handles a cancelled provider response at %s without consuming a PKCE code', async url => {
    browserAt(url);
    await expect(api.completaRitorno()).resolves.toBe('access_denied: Cancelled');
    expect(sdk.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(createClient).not.toHaveBeenCalled();
  });

  it('keeps native/SSR behavior when no browser origin or callback URL exists', async () => {
    await expect(api.completaRitorno()).resolves.toBeNull();
    expect(createClient).not.toHaveBeenCalled();
    await api.entraConGoogle('/iscrizione');
    expect(sdk.auth.signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: {} });
  });

  it('exposes provider startup failures for the screen to show and retry', async () => {
    sdk.auth.signInWithOAuth.mockResolvedValueOnce({ error: { message: 'Provider unavailable' } });
    await expect(api.entraConGoogle('/iscrizione')).rejects.toThrow('Provider unavailable');
    await expect(api.entraConGoogle('/iscrizione')).resolves.toBeUndefined();
  });
});
