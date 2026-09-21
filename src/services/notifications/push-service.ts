import { LightColors } from '@/constants/theme';
import { isApiError } from '@/services/api/client';
import {
  registerDriverDevice,
  unregisterDriverDevice,
  type DevicePlatform,
} from '@/services/api/driver-device-service';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Everything between "the OS will let us notify this driver" and "the backend
 * knows where to send it" — the driver-side mirror of hungry-mobile-customer's
 * `services/notifications/push-service.ts`. See that file's header comment
 * for why this matters (a WebSocket only exists while the app is running; a
 * push token is registered with the OS and delivered by APNs/FCM regardless).
 *
 * For a driver this is the fallback path specifically: while the app is
 * foregrounded and online, `services/realtime/stomp-client.ts`'s live STOMP
 * subscription is what actually delivers `ORDER_OFFERED` — see
 * `AssignmentNotificationDispatcher` on the backend, which only falls back to
 * push when no live session is open for that driver.
 */

/**
 * Must match `ANDROID_CHANNEL_ID` in the backend's `ExpoPushNotificationAdapter`
 * (`jfwk-notification`) — from Android 8 a notification naming a channel the
 * app never created is dropped by the OS with no error anywhere.
 */
const ORDERS_CHANNEL_ID = 'orders';

/**
 * How a delivered push is presented while the app is in the FOREGROUND. Set
 * at module scope so it is installed before any listener can fire — a driver
 * looking at the map when an order is assigned must still see something.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type PushRegistrationResult =
  | { status: 'registered'; token: string }
  | { status: 'denied' }
  | { status: 'unsupported'; reason: string }
  | { status: 'failed'; reason: string };

function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

function currentPlatform(): DevicePlatform {
  return Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
}

/** Safe to call repeatedly — Android treats a repeat create as an update. */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(ORDERS_CHANNEL_ID, {
    name: 'Order assignments',
    description: 'Tells you when a new delivery is assigned to you.',
    // MAX rather than DEFAULT: a driver needs to notice a new assignment
    // immediately, especially with the app backgrounded.
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    // The channel's LED colour is registered with Android once, outside React,
    // so it cannot follow the in-app theme — and it should not: it is the brand
    // orange, which is the same in both palettes.
    lightColor: LightColors.orange,
  });
}

/** Never re-prompts once denied — re-enabling is a trip to system settings. */
async function ensurePermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * Gets this device's push token and tells the backend about it.
 *
 * Called on every launch with a session (mirrors the customer app): the OS
 * can rotate a push token at any time, and registration is idempotent on the
 * backend, so repeating it is free.
 */
export async function ensurePushRegistration(): Promise<PushRegistrationResult> {
  if (Platform.OS === 'web') {
    return { status: 'unsupported', reason: 'Web push is not configured for this app.' };
  }

  if (Platform.OS === 'ios' && !Device.isDevice) {
    return {
      status: 'unsupported',
      reason: 'The iOS Simulator cannot register with APNs — push needs a physical iPhone.',
    };
  }

  const id = projectId();
  if (!id) {
    return {
      status: 'unsupported',
      reason:
        'No EAS project id in the app config. Run `eas init` (it writes extra.eas.projectId ' +
        'into app.json) and rebuild — Expo cannot mint a push token without it.',
    };
  }

  try {
    await ensureAndroidChannel();

    if (!(await ensurePermission())) {
      return { status: 'denied' };
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });

    await registerDriverDevice({
      pushToken: token,
      platform: currentPlatform(),
      deviceName: Device.deviceName ?? Device.modelName,
    });

    return { status: 'registered', token };
  } catch (error) {
    if (isApiError(error, 404)) {
      return {
        status: 'failed',
        reason: 'The account has no driver record yet; registration will retry on the next launch.',
      };
    }
    return { status: 'failed', reason: error instanceof Error ? error.message : String(error) };
  }
}

/** Must run BEFORE the session is cleared — see the customer app's push-service.ts. */
export async function clearPushRegistration(): Promise<void> {
  if (Platform.OS === 'web' || (Platform.OS === 'ios' && !Device.isDevice)) return;

  const id = projectId();
  if (!id) return;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    await unregisterDriverDevice(token);
  } catch (error) {
    console.warn('[Push] Could not unregister this device on sign-out:', error);
  }
}
