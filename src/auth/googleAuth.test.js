import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GOOGLE_ERROR_CODES,
  GOOGLE_ERROR_MESSAGES,
  GOOGLE_WEB_CLIENT_ID,
  classifyGoogleAuthError,
  decodeJwt,
  extractGoogleIdToken,
  initializeNativeGoogleSignIn,
  isNativePlatform,
  isOffline,
  resetNativeGoogleInit,
  signInWithNativeGoogle,
  userFromIdToken,
  withTimeout,
} from './googleAuth';
import { GUEST_USER, isGuestUser } from './guestUser';

function makeJwt(payload) {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return `${header}.${body}.sig`;
}

describe('classifyGoogleAuthError', () => {
  it.each([
    [{ code: 'USER_CANCELLED' }, GOOGLE_ERROR_CODES.CANCELLED],
    [{ message: 'The user canceled the sign-in flow' }, GOOGLE_ERROR_CODES.CANCELLED],
    [{ message: '12501' }, GOOGLE_ERROR_CODES.CANCELLED],
    [{ message: 'popup_closed_by_user' }, GOOGLE_ERROR_CODES.CANCELLED],
    [{ message: 'Failed to fetch' }, GOOGLE_ERROR_CODES.NETWORK],
    [{ code: 'NETWORK', message: 'offline' }, GOOGLE_ERROR_CODES.NETWORK],
    [{ message: 'Google Play services is missing' }, GOOGLE_ERROR_CODES.PLAY_SERVICES],
    [{ message: 'SERVICE_VERSION_UPDATE_REQUIRED' }, GOOGLE_ERROR_CODES.PLAY_SERVICES],
    [{ message: 'plugin initialize failed' }, GOOGLE_ERROR_CODES.PLUGIN_INIT],
    [{ message: 'Google Sign-In is still loading' }, GOOGLE_ERROR_CODES.PLUGIN_INIT],
    [{ message: 'Invalid token payload' }, GOOGLE_ERROR_CODES.TOKEN],
    [{ message: 'Google sign-in timed out' }, GOOGLE_ERROR_CODES.TIMEOUT],
    [{ message: 'something unexpected' }, GOOGLE_ERROR_CODES.UNKNOWN],
  ])('classifies %j as %s', (error, code) => {
    const classified = classifyGoogleAuthError(error);
    expect(classified.code).toBe(code);
    expect(classified.message).toBe(GOOGLE_ERROR_MESSAGES[code]);
    expect(classified.canRetry).toBe(true);
    expect(classified.message.toLowerCase()).toContain('guest');
  });
});

describe('token helpers', () => {
  it('reads id tokens from nested plugin results', () => {
    expect(extractGoogleIdToken({ result: { idToken: 'abc' } })).toBe('abc');
    expect(extractGoogleIdToken({ idToken: 'def' })).toBe('def');
    expect(extractGoogleIdToken({ result: { authentication: { idToken: 'ghi' } } })).toBe('ghi');
    expect(extractGoogleIdToken({})).toBeNull();
    expect(extractGoogleIdToken(null)).toBeNull();
  });

  it('builds a Google user from a valid ID token', () => {
    const token = makeJwt({
      email: 'jane@example.com',
      name: 'Jane Researcher',
      picture: 'https://example.com/a.png',
    });
    expect(decodeJwt(token).email).toBe('jane@example.com');
    expect(userFromIdToken(token)).toEqual({
      email: 'jane@example.com',
      name: 'Jane Researcher',
      role: 'Standard Access',
      avatarSeed: 'https://example.com/a.png',
      isGoogle: true,
    });
  });

  it('rejects tokens without email so login cannot fake a user', () => {
    expect(userFromIdToken(makeJwt({ name: 'No Email' }))).toBeNull();
    expect(userFromIdToken('not-a-jwt')).toBeNull();
  });
});

describe('native Google sign-in', () => {
  beforeEach(() => {
    resetNativeGoogleInit();
    vi.stubGlobal('navigator', { onLine: true });
  });

  it('initializes once, then returns the ID token', async () => {
    const SocialLogin = {
      initialize: vi.fn().mockResolvedValue(undefined),
      login: vi.fn().mockResolvedValue({ result: { idToken: 'native-token' } }),
    };

    const first = await signInWithNativeGoogle({ SocialLogin, loginTimeoutMs: 1000 });
    const second = await signInWithNativeGoogle({ SocialLogin, loginTimeoutMs: 1000 });

    expect(first).toBe('native-token');
    expect(second).toBe('native-token');
    expect(SocialLogin.initialize).toHaveBeenCalledTimes(1);
    expect(SocialLogin.initialize).toHaveBeenCalledWith({
      google: { webClientId: expect.stringContaining('.apps.googleusercontent.com') },
    });
    expect(SocialLogin.login).toHaveBeenCalledWith({
      provider: 'google',
      options: { scopes: ['email', 'profile'] },
    });
  });

  it('allows initialize to be retried after a plugin failure', async () => {
    const SocialLogin = {
      initialize: vi
        .fn()
        .mockRejectedValueOnce(new Error('plugin initialize failed'))
        .mockResolvedValueOnce(undefined),
      login: vi.fn().mockResolvedValue({ result: { idToken: 'retried' } }),
    };

    await expect(initializeNativeGoogleSignIn(SocialLogin)).rejects.toThrow(/plugin initialize failed/);
    await expect(signInWithNativeGoogle({ SocialLogin, loginTimeoutMs: 1000 })).resolves.toBe('retried');
    expect(SocialLogin.initialize).toHaveBeenCalledTimes(2);
  });

  it('fails fast when offline so Guest remains the path forward', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    const SocialLogin = { initialize: vi.fn(), login: vi.fn() };

    await expect(signInWithNativeGoogle({ SocialLogin })).rejects.toMatchObject({
      code: GOOGLE_ERROR_CODES.NETWORK,
    });
    expect(SocialLogin.initialize).not.toHaveBeenCalled();
    expect(SocialLogin.login).not.toHaveBeenCalled();
  });

  it('throws a token error when the plugin returns no ID token', async () => {
    const SocialLogin = {
      initialize: vi.fn().mockResolvedValue(undefined),
      login: vi.fn().mockResolvedValue({ result: {} }),
    };

    await expect(signInWithNativeGoogle({ SocialLogin, loginTimeoutMs: 1000 })).rejects.toMatchObject({
      code: GOOGLE_ERROR_CODES.TOKEN,
    });
  });

  it('surfaces plugin cancellation without inventing a user', async () => {
    const SocialLogin = {
      initialize: vi.fn().mockResolvedValue(undefined),
      login: vi.fn().mockRejectedValue({ code: 'USER_CANCELLED', message: 'cancelled' }),
    };

    await expect(signInWithNativeGoogle({ SocialLogin, loginTimeoutMs: 1000 })).rejects.toMatchObject({
      code: 'USER_CANCELLED',
    });
    expect(classifyGoogleAuthError({ code: 'USER_CANCELLED' }).code).toBe(GOOGLE_ERROR_CODES.CANCELLED);
  });
});

describe('helpers', () => {
  it('times out hung plugin calls', async () => {
    await expect(withTimeout(new Promise(() => {}), 20, 'Google sign-in timed out')).rejects.toMatchObject({
      code: GOOGLE_ERROR_CODES.TIMEOUT,
    });
  });

  it('detects native vs web and offline state', () => {
    expect(isNativePlatform({ isNativePlatform: () => true })).toBe(true);
    expect(isNativePlatform({ isNativePlatform: () => false })).toBe(false);
    expect(isNativePlatform({})).toBe(false);
    expect(isOffline({ onLine: false })).toBe(true);
    expect(isOffline({ onLine: true })).toBe(false);
  });

  it('keeps Guest independent of Google', () => {
    expect(GUEST_USER.isGoogle).toBe(false);
    expect(isGuestUser(GUEST_USER)).toBe(true);
    expect(isGuestUser({ ...GUEST_USER, isGoogle: true })).toBe(false);
  });

  it('uses the web/server client ID and does not embed Android OAuth client IDs', () => {
    expect(GOOGLE_WEB_CLIENT_ID).toContain('410691676577-k3e48h90p08r87u9ecgfhdrr6s3ml76h');
    expect(GOOGLE_WEB_CLIENT_ID).not.toContain('4bdare1064pok36iu7f1de43247vrtp6');
    expect(GOOGLE_WEB_CLIENT_ID).not.toContain('9rj0qaforrh2vabg1iq3so64hdqvj18t');
  });
});
