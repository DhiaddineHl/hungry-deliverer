import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface DriverAccountState {
  /**
   * Keycloak account id (`sub`) captured at registration. Bridges the gap
   * between sign-up and the first login, when there is no token to read the
   * sub from. Once authenticated, screens should prefer `user.sub` from the
   * auth context.
   */
  keycloakUserId: string | null;
  /** Backend Driver entity id returned by registration. */
  driverId: string | null;
  /** Vehicle class the deliverer registered with, for pre-login screens. */
  vehicleClass: string | null;
  setAccount: (account: {
    keycloakUserId: string;
    driverId: string;
    vehicleClass?: string | null;
  }) => void;
  clear: () => void;
}

export const useDriverStore = create<DriverAccountState>()(
  persist(
    (set) => ({
      keycloakUserId: null,
      driverId: null,
      vehicleClass: null,

      setAccount: ({ keycloakUserId, driverId, vehicleClass }) =>
        set({ keycloakUserId, driverId, vehicleClass: vehicleClass ?? null }),

      clear: () => set({ keycloakUserId: null, driverId: null, vehicleClass: null }),
    }),
    {
      name: 'hungry-deliverer-account',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
