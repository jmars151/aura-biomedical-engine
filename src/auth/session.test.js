import { describe, expect, it } from 'vitest';
import { clearPersistedUser, persistUser, readPersistedUser, USER_STORAGE_KEY } from './session';
import { GUEST_USER } from './guestUser';

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
    removeItem: (key) => {
      delete data[key];
    },
    get data() {
      return data;
    },
  };
}

describe('session persistence', () => {
  it('restores a previously signed-in Google user so they are not re-prompted', () => {
    const storage = memoryStorage();
    const user = {
      email: 'jane@example.com',
      name: 'Jane',
      isGoogle: true,
    };
    expect(persistUser(user, storage)).toBe(true);
    expect(readPersistedUser(storage)).toEqual(user);
    expect(storage.data[USER_STORAGE_KEY]).toContain('jane@example.com');
  });

  it('restores Guest the same way, without calling Google', () => {
    const storage = memoryStorage();
    persistUser(GUEST_USER, storage);
    expect(readPersistedUser(storage)).toEqual(GUEST_USER);
  });

  it('never crashes the login screen on corrupt or empty storage', () => {
    expect(readPersistedUser(memoryStorage({ [USER_STORAGE_KEY]: '{bad' }))).toBeNull();
    expect(readPersistedUser(memoryStorage({ [USER_STORAGE_KEY]: '{"name":"No Email"}' }))).toBeNull();
    expect(readPersistedUser(memoryStorage())).toBeNull();
    expect(readPersistedUser(null)).toBeNull();
  });

  it('clears the session on logout', () => {
    const storage = memoryStorage();
    persistUser(GUEST_USER, storage);
    clearPersistedUser(storage);
    expect(readPersistedUser(storage)).toBeNull();
  });
});
