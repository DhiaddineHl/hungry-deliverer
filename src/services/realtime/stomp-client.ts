import { getTokens } from '@/services/keycloak/token-storage';
import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';

/**
 * One shared STOMP connection to hungry-app's `/ws` endpoint (driver/customer
 * notifications and driver location ingestion are in-process components of
 * hungry-app now, not a separate hungry-notification deployable) — the live
 * path for `ORDER_ASSIGNED` while this app is foregrounded, and (via
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
  });

  stomp.beforeConnect = async () => {
    const tokens = await getTokens();
    stomp.connectHeaders = tokens?.accessToken
      ? { Authorization: `Bearer ${tokens.accessToken}` }
      : {};
  };

  stomp.onConnect = () => {
    for (const registration of registrations) {
      registration.subscription = stomp.subscribe(registration.destination, (message: IMessage) => {
        registration.listener(parseBody(message.body));
      });
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
