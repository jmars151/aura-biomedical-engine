// Web / server client ID only. @capgo/capacitor-social-login does not accept an
// Android client ID. Play-signing and upload-key Android OAuth clients live in
// the aura-biomedical Google Cloud project and must not be embedded here.
export const GOOGLE_WEB_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '410691676577-k3e48h90p08r87u9ecgfhdrr6s3ml76h.apps.googleusercontent.com';

export const GOOGLE_LOGIN_TIMEOUT_MS = 90_000;

export const GOOGLE_ERROR_CODES = {
  CANCELLED: 'cancelled',
  NETWORK: 'network',
  PLAY_SERVICES: 'play_services',
  PLUGIN_INIT: 'plugin_init',
  TOKEN: 'token',
  TIMEOUT: 'timeout',
  UNKNOWN: 'unknown',
};

export const GOOGLE_ERROR_MESSAGES = {
  [GOOGLE_ERROR_CODES.CANCELLED]:
    'Google sign-in was cancelled. You can try again, or continue as Guest without an account.',
  [GOOGLE_ERROR_CODES.NETWORK]:
    'No internet connection. Check your network and retry Google sign-in, or continue as Guest — Guest works offline.',
  [GOOGLE_ERROR_CODES.PLAY_SERVICES]:
    'Google Play services is missing or needs an update. Update Play services and retry, or continue as Guest.',
  [GOOGLE_ERROR_CODES.PLUGIN_INIT]:
    'Google sign-in could not start. Retry in a moment, or continue as Guest.',
  [GOOGLE_ERROR_CODES.TOKEN]:
    'We could not verify the Google account. Retry sign-in, or continue as Guest.',
  [GOOGLE_ERROR_CODES.TIMEOUT]:
    'Google sign-in took too long. Retry, or continue as Guest.',
  [GOOGLE_ERROR_CODES.UNKNOWN]:
    'Google sign-in did not complete. Retry, or continue as Guest to keep using the app.',
};

let nativeInitPromise = null;

export function resetNativeGoogleInit() {
  nativeInitPromise = null;
}

export function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode JWT token', error);
    return null;
  }
}

export function extractGoogleIdToken(loginResult) {
  if (!loginResult || typeof loginResult !== 'object') return null;
  return (
    loginResult.result?.idToken ||
    loginResult.idToken ||
    loginResult.result?.authentication?.idToken ||
    loginResult.authentication?.idToken ||
    null
  );
}

export function userFromIdToken(idToken) {
  const payload = decodeJwt(idToken);
  if (!payload?.email) return null;
  return {
    email: payload.email,
    name: payload.name || payload.given_name || 'Google Researcher',
    role: payload.email.endsWith('@aura.org') ? 'Admin Access' : 'Standard Access',
    avatarSeed: payload.picture || payload.given_name || 'google',
    isGoogle: true,
  };
}

export function isOffline(nav = globalThis.navigator) {
  return Boolean(nav && nav.onLine === false);
}

export function withTimeout(promise, ms, message = 'Google sign-in timed out') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(message);
      error.code = GOOGLE_ERROR_CODES.TIMEOUT;
      reject(error);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function collectErrorText(error) {
  if (!error) return '';
  if (typeof error === 'string') return error;
  return [
    error.code,
    error.message,
    error.errorMessage,
    error.error,
    error.reason,
    error.cause?.message,
    error.cause?.code,
  ]
    .filter(Boolean)
    .join(' ');
}

export function formatGoogleAuthErrorDetails(error) {
  if (!error) return '';
  if (typeof error === 'string') return error;
  const parts = [];
  if (error.code) parts.push(`code: ${error.code}`);
  const message = error.message || error.errorMessage || error.error;
  if (message) parts.push(String(message));
  if (error.reason && error.reason !== message) parts.push(String(error.reason));
  if (error.cause?.message) parts.push(String(error.cause.message));
  if (error.cause?.code) parts.push(`cause: ${error.cause.code}`);
  if (!parts.length) {
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return parts.join(' — ');
}

export function classifyGoogleAuthError(error) {
  const raw = collectErrorText(error).toLowerCase();
  const details = formatGoogleAuthErrorDetails(error);

  const match = (code) => ({
    code,
    message: GOOGLE_ERROR_MESSAGES[code],
    canRetry: true,
    details,
  });

  if (
    /cancel|cancelled|canceled|dismiss|12501|user_cancelled|sign[_ ]?in aborted|popup_closed/.test(raw)
  ) {
    return match(GOOGLE_ERROR_CODES.CANCELLED);
  }
  if (/timeout|timed out/.test(raw)) {
    return match(GOOGLE_ERROR_CODES.TIMEOUT);
  }
  if (
    /initialize|plugin|not implemented|unimpl|sociallogin|no provider|could not start|still loading|main activity|cannot use scopes|cannot use offline|28444|developer console is not set up/.test(
      raw
    )
  ) {
    return match(GOOGLE_ERROR_CODES.PLUGIN_INIT);
  }
  if (
    /no internet|failed to fetch|unreachable|err_internet|err_name_not_resolved|network error|connection refused|\boffline\b/.test(
      raw
    ) &&
    !/offline mode/.test(raw)
  ) {
    return match(GOOGLE_ERROR_CODES.NETWORK);
  }
  if (
    /play services|google play|gms|service_invalid|service_missing|service_version_update_required|service_disabled|service_updating|api.?exception:\s*10\b/.test(
      raw
    )
  ) {
    return match(GOOGLE_ERROR_CODES.PLAY_SERVICES);
  }
  if (/token|jwt|payload|invalid token/.test(raw)) {
    return match(GOOGLE_ERROR_CODES.TOKEN);
  }
  return match(GOOGLE_ERROR_CODES.UNKNOWN);
}

export async function initializeNativeGoogleSignIn(SocialLogin, webClientId = GOOGLE_WEB_CLIENT_ID) {
  if (!SocialLogin?.initialize) {
    const error = new Error('Google sign-in plugin is unavailable');
    error.code = GOOGLE_ERROR_CODES.PLUGIN_INIT;
    throw error;
  }
  if (!nativeInitPromise) {
    nativeInitPromise = SocialLogin.initialize({
      google: {
        webClientId,
        mode: 'online',
      },
    });
  }
  try {
    await nativeInitPromise;
  } catch (error) {
    nativeInitPromise = null;
    throw error;
  }
}

export async function signInWithNativeGoogle({
  SocialLogin,
  webClientId = GOOGLE_WEB_CLIENT_ID,
  loginTimeoutMs = GOOGLE_LOGIN_TIMEOUT_MS,
} = {}) {
  if (isOffline()) {
    const error = new Error('No internet connection');
    error.code = GOOGLE_ERROR_CODES.NETWORK;
    throw error;
  }

  await initializeNativeGoogleSignIn(SocialLogin, webClientId);

  if (!SocialLogin?.login) {
    const error = new Error('Google sign-in plugin login is unavailable');
    error.code = GOOGLE_ERROR_CODES.PLUGIN_INIT;
    throw error;
  }

  // Do not pass custom scopes. The plugin already requests the default OIDC
  // email/profile/openid scopes. Passing a scopes array makes 8.x reject
  // immediately unless MainActivity implements ModifiedMainActivityForSocialLoginPlugin.
  const loginResult = await withTimeout(
    SocialLogin.login({
      provider: 'google',
      options: {
        filterByAuthorizedAccounts: false,
      },
    }),
    loginTimeoutMs,
    'Google sign-in timed out'
  );

  const idToken = extractGoogleIdToken(loginResult);
  if (!idToken) {
    const error = new Error('Google sign-in did not return an ID token');
    error.code = GOOGLE_ERROR_CODES.TOKEN;
    throw error;
  }
  return idToken;
}

export function isNativePlatform(Capacitor) {
  try {
    return Boolean(Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}
