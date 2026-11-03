export const GUEST_USER = {
  email: 'guest@aurabiomedical.org',
  name: 'Guest Scientist',
  role: 'Standard Access',
  avatarSeed: 'guest_scientist',
  isGoogle: false,
};

export function isGuestUser(user) {
  return Boolean(user && user.email === GUEST_USER.email && user.isGoogle === false);
}
