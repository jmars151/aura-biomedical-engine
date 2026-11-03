export const USER_STORAGE_KEY = 'aura_current_user';

export function readPersistedUser(storage = globalThis.localStorage) {
  if (!storage) return null;
  try {
    const saved = storage.getItem(USER_STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object' || !parsed.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function persistUser(user, storage = globalThis.localStorage) {
  if (!storage || !user?.email) return false;
  try {
    storage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    return true;
  } catch {
    return false;
  }
}

export function clearPersistedUser(storage = globalThis.localStorage) {
  if (!storage) return;
  try {
    storage.removeItem(USER_STORAGE_KEY);
  } catch {
    // ignore quota / private-mode failures
  }
}
