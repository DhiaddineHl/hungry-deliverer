import { create } from 'zustand';

/**
 * The outcome of the last applicant lookup that ended on the application form
 * with a rejected application behind it.
 *
 * Held in memory instead of travelling as route params: every route is
 * reachable from outside through the `hungrydeliverer://` scheme, so a param
 * like `rejectionReason` would let any link put arbitrary text in front of the
 * rider as if it were the team's verdict. Only `routeForApplicant`, which runs
 * on the backend's answer, writes here; the form reads it back only for the
 * same address.
 */
interface ApplicantState {
  email: string | null;
  rejected: boolean;
  rejectionReason: string | null;
  setOutcome: (outcome: { email: string; rejected: boolean; rejectionReason?: string | null }) => void;
  clear: () => void;
}

export const useApplicantStore = create<ApplicantState>()((set) => ({
  email: null,
  rejected: false,
  rejectionReason: null,
  setOutcome: ({ email, rejected, rejectionReason }) =>
    set({ email, rejected, rejectionReason: rejectionReason?.trim() || null }),
  clear: () => set({ email: null, rejected: false, rejectionReason: null }),
}));
