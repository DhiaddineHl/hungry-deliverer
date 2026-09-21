import { apiClient } from './client';

/**
 * Push-device registration against the gateway — the driver-side mirror of
 * hungry-mobile-customer's `services/api/device-service.ts`.
 *
 * Both routes act on the CALLER's account: the backend takes the Keycloak
 * user id from the token's `sub`, never from the body. Feeds
 * the backend's Expo push fallback for `ORDER_OFFERED` — the path a
 * backgrounded or killed app relies on instead of the live STOMP subscription
 * (`services/realtime/stomp-client.ts`).
 */

const DEVICES = '/drivers/me/devices';

export type DevicePlatform = 'ios' | 'android' | 'web';

export interface DeviceRegistration {
  /** The Expo push token, `ExponentPushToken[...]`. */
  pushToken: string;
  platform: DevicePlatform;
  /** Human-readable device name, for support. Optional. */
  deviceName?: string | null;
}

/**
 * Registers this device so a new assignment can reach it while the app is
 * backgrounded or closed.
 *
 * Idempotent: re-posting the same token refreshes it, and a token the backend
 * holds for another account is moved to this one.
 *
 * Throws `ApiError` 404 when the account has no driver record yet — the
 * caller treats that as "not ready", not as a failure.
 */
export async function registerDriverDevice(registration: DeviceRegistration): Promise<void> {
  await apiClient.post(DEVICES, {
    pushToken: registration.pushToken,
    platform: registration.platform,
    deviceName: registration.deviceName ?? null,
  });
}

/**
 * Stops push delivery to one token — called on sign-out, before the session
 * is torn down, because the request needs the token that is about to be
 * cleared.
 */
export async function unregisterDriverDevice(pushToken: string): Promise<void> {
  await apiClient.delete(DEVICES, { data: { pushToken } });
}
