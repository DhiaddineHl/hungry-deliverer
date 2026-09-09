import { useAuth } from '@/contexts/auth-context';
import { ensurePushRegistration } from '@/services/notifications/push-service';
import { useEffect } from 'react';

/**
 * Registers this device for push notifications once a session (and driver
 * record) exist — the driver-side mirror of hungry-mobile-customer's
 * `use-push-notifications.ts`, trimmed to registration only.
 *
 * No notification-tap routing here (unlike the customer app): an
 * `ORDER_ASSIGNED` tap has nowhere more specific to go than `/delivery`,
 * which the auth-gated router already lands on, and the offer itself
 * surfaces there automatically via the live STOMP subscription in
 * `session-context.tsx` once the screen is mounted.
 */
export function usePushNotifications(): void {
  const { isAuthenticated, isDriverResolved } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !isDriverResolved) return;

    let cancelled = false;
    ensurePushRegistration().then((result) => {
      if (cancelled) return;
      switch (result.status) {
        case 'registered':
          console.log('[Push] Device registered for assignment notifications');
          break;
        case 'denied':
          console.log('[Push] Notifications were declined — assignments will only arrive live in-app');
          break;
        default:
          console.warn(`[Push] Not registered: ${result.reason}`);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isDriverResolved]);
}
