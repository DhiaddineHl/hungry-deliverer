import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/contexts/auth-context';
import { haversine } from '@/features/navigation/geo';
import { useDriver } from '@/hooks/use-driver';
import { useDriverAvailability } from '@/hooks/use-driver-availability';
import { useDriverLocation } from '@/hooks/use-driver-location';
import { isApiError } from '@/services/api/client';
import {
  acceptOffer as acceptOfferRequest,
  declineOffer as declineOfferRequest,
  fetchCurrentOffer,
  updateDeliveryStatus,
} from '@/services/api/delivery-service';
import { subscribeToTopic } from '@/services/realtime/stomp-client';
import { clockTime, parseDriverNotification, toSessionOrder } from '@/features/session/order-mapper';
import type { LatLng, Order, RouteLeg, SessionState } from '@/features/session/types';

type Action =
  | { type: 'GO_ONLINE' }
  | { type: 'STOP_SESSION' }
  | { type: 'OFFER_RECEIVED'; order: Order }
  | { type: 'PREVIEW_LEG'; leg: RouteLeg }
  | { type: 'OFFER_CLOSED' }
  | { type: 'ACCEPT_STARTED' }
  | { type: 'ACCEPT_FAILED' }
  | { type: 'OFFER_ACCEPTED'; order: Order }
  | { type: 'ORDER_READY' }
  | { type: 'VALIDATE_ORDER' }
  | { type: 'CONFIRM_DELIVERY' }
  | { type: 'SET_SHEET_EXPANDED'; expanded: boolean };

const INITIAL_STATE: SessionState = {
  phase: 'offline',
  order: null,
  previewedLeg: 'store',
  sheetExpanded: false,
  accepting: false,
};

/** How close the driver has to be to the store for "Validate Order" to unlock. */
const ARRIVAL_RADIUS_METERS = 120;

/** How long the "Great work!" screen stays up before the driver goes looking again. */
const COMPLETED_PAUSE_MS = 6_000;

function reducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case 'GO_ONLINE':
      return { ...INITIAL_STATE, phase: 'finding' };

    case 'STOP_SESSION':
      return INITIAL_STATE;

    case 'OFFER_RECEIVED':
      // Also from 'offline': a push tap can cold-start the app with an offer
      // already waiting server-side (the driver was online when the app died).
      // Taking it straight to the popup — rather than making them tap "Go
      // online" first — is the whole point of the push.
      if (state.phase !== 'finding' && state.phase !== 'offline') return state;
      return { ...state, phase: 'offer', order: action.order, previewedLeg: 'store', accepting: false };

    case 'PREVIEW_LEG':
      return { ...state, previewedLeg: action.leg };

    // Declined, expired, or lost to the accept race — every way an offer
    // leaves the table without becoming a delivery ends up here.
    case 'OFFER_CLOSED':
      if (state.phase !== 'offer') return state;
      return { ...INITIAL_STATE, phase: 'finding' };

    case 'ACCEPT_STARTED':
      if (state.phase !== 'offer') return state;
      return { ...state, accepting: true };

    case 'ACCEPT_FAILED':
      if (state.phase !== 'offer') return state;
      return { ...state, accepting: false };

    case 'OFFER_ACCEPTED':
      if (state.phase !== 'offer') return state;
      return {
        ...state,
        phase: 'toStore',
        order: action.order,
        previewedLeg: 'store',
        sheetExpanded: false,
        accepting: false,
      };

    case 'ORDER_READY':
      if (state.phase !== 'toStore') return state;
      return { ...state, phase: 'orderReady', sheetExpanded: true };

    case 'VALIDATE_ORDER':
      if (state.phase !== 'orderReady') return state;
      return { ...state, phase: 'toCustomer', previewedLeg: 'customer', sheetExpanded: true };

    case 'CONFIRM_DELIVERY':
      if (state.phase !== 'toCustomer' || !state.order) return state;
      return {
        ...state,
        phase: 'completed',
        sheetExpanded: true,
        order: { ...state.order, arrivedAt: clockTime(Date.now()) },
      };

    case 'SET_SHEET_EXPANDED':
      return { ...state, sheetExpanded: action.expanded };

    default:
      return state;
  }
}

export type SessionActions = {
  goOnline: () => void;
  stopSession: () => void;
  previewLeg: (leg: RouteLeg) => void;
  declineOffer: () => void;
  acceptOffer: () => void;
  validateOrder: () => void;
  confirmDelivery: () => void;
  setSheetExpanded: (expanded: boolean) => void;
};

type SessionContextValue = SessionState & {
  actions: SessionActions;
  locationGranted: boolean;
  /** The driver's real live position, or `null` until the first GPS fix. */
  location: LatLng | null;
  /** `location`, falling back to the demo start point until the first fix. */
  courier: LatLng;
};

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Single source of truth for the courier flow, wired to the real backend.
 * What each phase transition actually does:
 *
 *   - `GO_ONLINE` / the completed→finding loop: `PUT /drivers/me/availability`
 *     with the driver's current position. Required every time, not just once:
 *     the assignment engine drops a driver from its available pool the moment
 *     it matches them (`DriverRegistry#markUnavailable`), so finishing a
 *     delivery — or declining/timing out an offer — leaves the driver
 *     un-registered until this fires again.
 *   - `OFFER_RECEIVED`: an `ORDER_OFFERED` STOMP frame on
 *     `/topic/drivers/{driverId}/notifications`, carrying the full offer
 *     (restaurant, customer area, items, total, ETAs, deadline). Subscribed
 *     only while `phase === 'finding'`. Because the socket is deliberately
 *     closed while the app is backgrounded (see `wireAppStateToConnection`),
 *     a frame sent meanwhile is gone by the time it reopens — so coming back
 *     to the foreground while finding also asks `GET /api/offers/current`.
 *   - `acceptOffer`: `POST /api/offers/{orderId}/accept`. Nothing is
 *     committed until the backend answers — it is what creates the
 *     `Delivery` — so the phase only moves to `toStore` on success, with the
 *     `deliveryId` from the response. A 409 means the offer expired or was
 *     already answered: back to finding.
 *   - `declineOffer` (tap, or the countdown running out):
 *     `POST /api/offers/{orderId}/decline`, then re-register availability.
 *   - `OFFER_EXPIRED` frame: the backend's sweeper beat the local countdown;
 *     drop the popup and re-register.
 *   - `toStore` → `orderReady`: a live proximity check (haversine distance to
 *     the store) — there is no backend signal for "the restaurant marked this
 *     ready" reaching the driver today.
 *   - `validateOrder` / `confirmDelivery`: `POST /api/deliveries/{id}/status`
 *     (`PICKED_UP` / `DELIVERED`). Pickup is what switches the map to the
 *     customer leg.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const { phase, order } = state;

  const { user } = useAuth();
  const { data: driver } = useDriver(user?.sub);
  const driverId = driver?.id ?? null;

  const { granted: locationGranted, location, courier } = useDriverLocation({
    driverId,
    reportEnabled: phase !== 'offline',
  });
  const availabilityMutation = useDriverAvailability();

  // Read inside effects/callbacks without retriggering them on every GPS tick.
  const courierRef = useRef<LatLng>(courier);
  useEffect(() => {
    courierRef.current = courier;
  }, [courier]);
  const stateRef = useRef<SessionState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // The last order whose offer left the table without becoming a delivery.
  // Its decline is still in flight when the phase flips back to 'finding', so
  // a foreground resync racing it could fetch the very offer just declined —
  // this is what makes that fetch a no-op.
  const closedOrderIdRef = useRef<string | null>(null);

  // `courier` already falls back to the demo start point, so this needs no
  // dependency on the live position and stays stable across GPS ticks —
  // everything below that re-registers availability hangs off it.
  const registerAvailable = useCallback((onError?: (error: unknown) => void) => {
    const position = courierRef.current;
    availabilityMutation.mutate(
      { available: true, latitude: position.latitude, longitude: position.longitude },
      { onError }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- availabilityMutation.mutate is stable
  }, []);

  const closeOffer = useCallback(
    (orderId: string) => {
      closedOrderIdRef.current = orderId;
      dispatch({ type: 'OFFER_CLOSED' });
      // Re-enter the available pool for the next match — see the module doc.
      registerAvailable();
    },
    [registerAvailable]
  );

  const goOnline = useCallback(() => {
    dispatch({ type: 'GO_ONLINE' });
    registerAvailable((error) => {
      console.warn('[Session] Could not go online:', error);
      dispatch({ type: 'STOP_SESSION' });
    });
  }, [registerAvailable]);

  const stopSession = useCallback(() => {
    dispatch({ type: 'STOP_SESSION' });
    availabilityMutation.mutate({ available: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live frames from the backend, while looking for orders and while an offer
  // is up. One subscription for both, gated on the latest state through a ref
  // rather than on `phase`/`order` directly, so a GPS tick or the offer→finding
  // flip never tears the STOMP subscription down and back up.
  //   ORDER_OFFERED — only while 'finding': the engine only ever offers one
  //     order to an AVAILABLE driver, and this app only asks to be available
  //     while actively looking.
  //   OFFER_EXPIRED — the backend's sweeper beat the local countdown (clock
  //     skew, a paused JS timer). Ignored unless it names the offer on screen.
  const listening = phase === 'finding' || phase === 'offer';
  useEffect(() => {
    if (!driverId || !listening) return;
    return subscribeToTopic(`/topic/drivers/${driverId}/notifications`, (payload) => {
      const notification = parseDriverNotification(payload);
      if (!notification) return;
      const current = stateRef.current;

      if (notification.type === 'ORDER_OFFERED') {
        if (current.phase !== 'finding') return;
        dispatch({
          type: 'OFFER_RECEIVED',
          order: toSessionOrder(notification.offer, courierRef.current),
        });
        return;
      }

      if (current.phase !== 'offer' || current.order?.orderId !== notification.orderId) return;
      closeOffer(notification.orderId);
    });
  }, [driverId, listening, closeOffer]);

  // Foreground resync: an ORDER_OFFERED frame sent while the socket was
  // closed is not replayed, but the offer itself is still waiting server-side
  // (until it expires) — fetch it. Also covers the push-notification path:
  // the tap opens the app — foregrounded, or cold-started still 'offline' —
  // and this is what puts the popup up.
  useEffect(() => {
    if (!driverId || (phase !== 'finding' && phase !== 'offline')) return;

    let cancelled = false;
    const resync = () => {
      fetchCurrentOffer()
        .then((offer) => {
          if (cancelled || !offer || offer.orderId === closedOrderIdRef.current) return;
          const current = stateRef.current.phase;
          if (current !== 'finding' && current !== 'offline') return;
          dispatch({ type: 'OFFER_RECEIVED', order: toSessionOrder(offer, courierRef.current) });
        })
        .catch((error) => {
          console.warn('[Session] Could not check for a pending offer:', error);
        });
    };

    resync();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') resync();
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [driverId, phase]);

  const declineOffer = useCallback(() => {
    if (!order) return;
    const orderId = order.orderId;
    closeOffer(orderId);
    declineOfferRequest(orderId).catch((error) => {
      console.warn('[Session] Could not decline the offer:', error);
    });
  }, [order, closeOffer]);

  // The auto-decline countdown, against the deadline the backend set on the
  // offer: an offer that goes unanswered is declined on the driver's behalf.
  useEffect(() => {
    if (phase !== 'offer' || !order) return;
    const remaining = Math.max(0, order.expiresAt - Date.now());
    const timer = setTimeout(declineOffer, remaining);
    return () => clearTimeout(timer);
  }, [phase, order, declineOffer]);

  const acceptOffer = useCallback(() => {
    if (!order || state.accepting) return;
    const orderId = order.orderId;
    dispatch({ type: 'ACCEPT_STARTED' });
    acceptOfferRequest(orderId)
      .then((accepted) => {
        dispatch({ type: 'OFFER_ACCEPTED', order: toSessionOrder(accepted, courierRef.current) });
      })
      .catch((error) => {
        if (isApiError(error, 409)) {
          // Expired or already answered — the offer is gone whatever we do.
          console.warn('[Session] Offer is no longer available:', error.message);
          closeOffer(orderId);
          return;
        }
        // Transient failure: leave the card up so the driver can retry before
        // the countdown runs out.
        console.warn('[Session] Could not accept the offer:', error);
        dispatch({ type: 'ACCEPT_FAILED' });
      });
  }, [order, state.accepting, closeOffer]);

  // Proximity replaces a "restaurant marked it ready" signal — see the module doc.
  useEffect(() => {
    if (phase !== 'toStore' || !order || !location) return;
    if (haversine(location, order.store.coordinate) <= ARRIVAL_RADIUS_METERS) {
      dispatch({ type: 'ORDER_READY' });
    }
  }, [phase, order, location]);

  const validateOrder = useCallback(() => {
    if (!order?.deliveryId || !driverId) return;
    dispatch({ type: 'VALIDATE_ORDER' });
    const position = location ?? courierRef.current;
    updateDeliveryStatus(order.deliveryId, driverId, order.orderId, 'PICKED_UP', position).catch(
      (error) => {
        console.warn('[Session] Could not report pickup:', error);
      }
    );
  }, [order, driverId, location]);

  const confirmDelivery = useCallback(() => {
    if (!order?.deliveryId || !driverId) return;
    dispatch({ type: 'CONFIRM_DELIVERY' });
    const position = location ?? courierRef.current;
    updateDeliveryStatus(order.deliveryId, driverId, order.orderId, 'DELIVERED', position).catch(
      (error) => {
        console.warn('[Session] Could not report delivery:', error);
      }
    );
  }, [order, driverId, location]);

  // Back to looking, automatically, after a pause to show "Great work!" —
  // goes through the same real availability call goOnline does, since the
  // engine dropped this driver from its pool the moment it matched them.
  useEffect(() => {
    if (phase !== 'completed') return;
    const timer = setTimeout(goOnline, COMPLETED_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [phase, goOnline]);

  const previewLeg = useCallback((leg: RouteLeg) => dispatch({ type: 'PREVIEW_LEG', leg }), []);
  const setSheetExpanded = useCallback(
    (expanded: boolean) => dispatch({ type: 'SET_SHEET_EXPANDED', expanded }),
    []
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      ...state,
      locationGranted,
      location,
      courier,
      actions: {
        goOnline,
        stopSession,
        previewLeg,
        declineOffer,
        acceptOffer,
        validateOrder,
        confirmDelivery,
        setSheetExpanded,
      },
    }),
    [
      state,
      locationGranted,
      location,
      courier,
      goOnline,
      stopSession,
      previewLeg,
      declineOffer,
      acceptOffer,
      validateOrder,
      confirmDelivery,
      setSheetExpanded,
    ]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used inside a <SessionProvider>');
  }
  return context;
}
