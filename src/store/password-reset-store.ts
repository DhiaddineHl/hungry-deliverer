import { create } from 'zustand';

/**
 * The hand-off between the three screens of a forgotten-password reset:
 * `/forgot-password` (address) → `/reset-code` (the mailed code) →
 * `/new-password` (the password itself).
 *
 * Deliberately NOT persisted, like the pending-verification store and for the
 * same reason: the ticket is a live authorization to change someone's
 * password, and that does not belong in AsyncStorage. It lives in memory for
 * the length of the flow and is dropped the moment the password is set (or the
 * deliverer backs out). If the app is killed mid-reset the ticket is simply
 * gone and the deliverer starts again — the backend expires it on its own
 * clock anyway.
 */
/**
 * Where the reset was started, which decides two things the three screens
 * cannot work out for themselves: whether a signed-in deliverer is allowed to
 * be on them at all (the root navigator normally bounces a session out of the
 * auth group), and where the flow returns to once the password is set.
 *
 * 'login' is the classic forgotten-password case — no session, ends at the
 * front door. 'settings' is a deliberate password change by someone already
 * signed in, and ends back in Settings with the session intact.
 */
export type PasswordResetOrigin = 'login' | 'settings';

interface PasswordResetState {
  /** The address a code was mailed to, and the login username. */
  email: string | null;
  origin: PasswordResetOrigin;
  /**
   * The single-use secret returned by `/drivers/password-reset/verify`, spent
   * by `/drivers/password-reset/confirm`. Null until the code has been
   * accepted.
   */
  ticket: string | null;

  /** Begins a reset for an address (clears any ticket from a previous run). */
  start: (email: string, origin?: PasswordResetOrigin) => void;
  /** Records the ticket the accepted code bought. */
  setTicket: (ticket: string) => void;
  clear: () => void;
}

const EMPTY = {
  email: null,
  ticket: null,
  origin: 'login',
} as const;

export const usePasswordResetStore = create<PasswordResetState>()((set) => ({
  ...EMPTY,

  start: (email, origin = 'login') => set({ email, origin, ticket: null }),

  setTicket: (ticket) => set({ ticket }),

  clear: () => set({ ...EMPTY }),
}));
