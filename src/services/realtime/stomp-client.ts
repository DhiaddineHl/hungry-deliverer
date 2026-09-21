import { isTokenExpired, refreshAccessToken } from '@/services/keycloak/auth-service';
import { getTokens } from '@/services/keycloak/token-storage';
import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * One shared STOMP connection to hungry-app's `/ws` endpoint (driver/customer
 * notifications and driver location ingestion are in-process components of
 * hungry-app now, not a separate hungry-notification deployable) — the live
 * path for `ORDER_OFFERED` while this app is foregrounded, and (via
 * `publishToDestination` below) for outbound GPS position pings too. See
 * hungry-mobile-customer's `services/realtime/stomp-client.ts` for the full
 * reasoning (identical design, mirrored here): a raw WebSocket (not SockJS —
 * RN has a native `WebSocket`), token sent as a STOMP CONNECT header (the WS
 * handshake itself can't carry one), reconnect-safe subscriptions.
 */

type Listener = (payload: unknown) => void;

interface Registration {
  destination: string;
  listener: Listener;
  subscription: StompSubscription | null;
}

let client: Client | null = null;
const registrations = new Set<Registration>();

function resolveBrokerUrl(): string {
  const apiBase = process.env.EXPO_PUBLIC_API_URL ?? 'http://172.29.80.1:8080';
  return `${apiBase.replace(/^http/, 'ws')}/ws/websocket`;
}

function parseBody(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

function ensureClient(): Client {
  if (client) return client;

  const stomp = new Client({
    brokerURL: resolveBrokerUrl(),
    reconnectDelay: 4000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    // React Native's WebSocket: send frames as binary and tolerate a dropped
    // trailing NULL on incoming ones — stompjs's documented RN settings.
    // Without them frames can silently fail to parse on Android, so CONNECTED
    // never fires, no subscription is ever made, and the driver only ever
    // sees the push fallback.
    forceBinaryWSFrames: true,
    appendMissingNULLonIncoming: true,
  });

  // Same refresh-if-expired the REST client's request interceptor does — a
  // STOMP CONNECT with a stale bearer is rejected server-side, and a client
  // that never refreshes then reconnects every 4s with the same dead token
  // forever, invisibly (only the push fallback would ever reach the driver).
  stomp.beforeConnect = async () => {
    let tokens = await getTokens();
    if (tokens && isTokenExpired(tokens.accessToken)) {
      const result = await refreshAccessToken();
      tokens = result.success && result.tokens ? result.tokens : null;
    }
    stomp.connectHeaders = tokens?.accessToken
      ? { Authorization: `Bearer ${tokens.accessToken}` }
      : {};
  };

  stomp.onConnect = () => {
    console.log(`[Realtime] Connected, replaying ${registrations.size} subscription(s)`);
    for (const registration of registrations) {
      registration.subscription = stomp.subscribe(registration.destination, (message: IMessage) => {
        registration.listener(parseBody(message.body));
      });
    }
  };

  // A failed connection used to be invisible — nothing logged, subscriptions
  // simply never delivered. These are the three ways it fails.
  stomp.onStompError = (frame) => {
    console.warn('[Realtime] STOMP error:', frame.headers.message ?? frame.body);
  };
  stomp.onWebSocketError = (event: unknown) => {
    const message = event && typeof event === 'object' && 'message' in event ? event.message : event;
    console.warn(`[Realtime] WebSocket error against ${stomp.brokerURL}:`, message);
  };
  stomp.onWebSocketClose = (event: { code?: number; reason?: string }) => {
    if (stomp.active) {
      console.warn(`[Realtime] WebSocket closed (${event.code} ${event.reason ?? ''}) — reconnecting`);
    }
  };

  stomp.activate();
  client = stomp;
  return stomp;
}

/**
 * Subscribes to one STOMP destination for as long as the caller wants.
 * Returns an unsubscribe function — call it on unmount / when going offline.
 */
export function subscribeToTopic(destination: string, listener: Listener): () => void {
  const stomp = ensureClient();
  const registration: Registration = { destination, listener, subscription: null };
  registrations.add(registration);

  if (stomp.connected) {
    registration.subscription = stomp.subscribe(destination, (message: IMessage) => {
      listener(parseBody(message.body));
    });
  }

  return () => {
    registrations.delete(registration);
    registration.subscription?.unsubscribe();
  };
}

/**
 * Sends a client→server STOMP SEND frame on the shared connection — the
 * outbound counterpart of `subscribeToTopic`, used for GPS position reporting
 * (see `driver-location-service.ts`). Silently dropped if the connection
 * isn't up yet: the next GPS fix (5s later, see `use-driver-location.ts`)
 * retries, and a dropped position ping needs no user-visible error the way a
 * dropped delivery-status change would.
 */
export function publishToDestination(destination: string, body: unknown): void {
  const stomp = ensureClient();
  if (!stomp.connected) return;
  stomp.publish({ destination, body: JSON.stringify(body) });
}

/**
 * Closes the connection while the app is backgrounded, and reopens it on
 * return.
 *
 * This is what makes the push fallback work, and it is not an optimisation.
 * The backend decides between a live frame and a push notification by asking
 * `SimpUserRegistry` whether a STOMP session exists for the driver
 * (`AssignmentNotificationDispatcher.notifyDriver`). A backgrounded app is not
 * a driver who can see anything — but its socket lingers server-side until the
 * 10s heartbeats lapse, and an assignment landing in that window is counted as
 * delivered live, so no push is sent and the driver never learns about it.
 * Disconnecting deliberately collapses that window to the round-trip of the
 * close frame.
 *
 * Subscriptions survive: `registrations` is module state, and `onConnect`
 * re-subscribes every entry, which is the same path a dropped-connection
 * reconnect already takes.
 *
 * Call once from the root layout; returns the teardown.
 */
export function wireAppStateToConnection(): () => void {
  const onChange = (status: AppStateStatus) => {
    // 'inactive' is iOS's transient state (control centre, app switcher, an
    // incoming call) and is deliberately NOT treated as backgrounded — tearing
    // the socket down every time someone swipes the notification shade would
    // cost more than it saves.
    if (status === 'background') {
      client?.deactivate();
      return;
    }
    if (status === 'active' && client && !client.active) {
      client.activate();
    }
  };

  const subscription = AppState.addEventListener('change', onChange);
  return () => subscription.remove();
}
