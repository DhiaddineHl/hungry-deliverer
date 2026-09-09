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

import { OFFER_COUNTDOWN_MS } from '@/data/mock';
import { useAuth } from '@/contexts/auth-context';
import { haversine } from '@/features/navigation/geo';
import { useDriver } from '@/hooks/use-driver';
import { useDriverAvailability } from '@/hooks/use-driver-availability';
import { useDriverLocation } from '@/hooks/use-driver-location';
import { respondToDelivery, updateDeliveryStatus } from '@/services/api/delivery-service';
import { subscribeToTopic } from '@/services/realtime/stomp-client';
import { parseOrderAssignedPayload, toSessionOrder } from '@/features/session/order-mapper';
import type { LatLng, Order, RouteLeg, SessionState } from '@/features/session/types';

type Action =
  | { type: 'GO_ONLINE' }
  | { type: 'STOP_SESSION' }
  | { type: 'OFFER_RECEIVED'; order: Order }
  | { type: 'PREVIEW_LEG'; leg: RouteLeg }
  | { type: 'DECLINE_OFFER' }
  | { type: 'ACCEPT_OFFER' }
  | { type: 'ORDER_READY' }
  | { type: 'VALIDATE_ORDER' }
  | { type: 'CONFIRM_DELIVERY' }
  | { type: 'SET_SHEET_EXPANDED'; expanded: boolean };

const INITIAL_STATE: SessionState = {
  phase: 'offline',
  order: null,
  previewedLeg: 'store',
  sheetExpanded: false,
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
      if (state.phase !== 'finding') return state;
      return { ...state, phase: 'offer', order: action.order, previewedLeg: 'store' };

    case 'PREVIEW_LEG':
      return { ...state, previewedLeg: action.leg };

    case 'DECLINE_OFFER':
      if (state.phase !== 'offer') return state;
      return { ...INITIAL_STATE, phase: 'finding' };

    case 'ACCEPT_OFFER':
      if (state.phase !== 'offer') return state;
      return { ...state, phase: 'toStore', previewedLeg: 'store', sheetExpanded: false };

    case 'ORDER_READY':
      if (state.phase !== 'toStore') return state;
      return { ...state, phase: 'orderReady', sheetExpanded: true };

    case 'VALIDATE_ORDER':
      if (state.phase !== 'orderReady') return state;
      return { ...state, phase: 'toCustomer', previewedLeg: 'customer', sheetExpanded: true };

    case 'CONFIRM_DELIVERY':
      if (state.phase !== 'toCustomer') return state;
      return { ...state, phase: 'completed', sheetExpanded: true };

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
  /** The driver's real live position, falling back to the demo start point until the first fix. */
  courier: LatLng;
};

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Single source of truth for the courier flow — now wired to the real
 * backend instead of timers. What each phase transition actually does:
 *
 *   - `GO_ONLINE` / the completed→finding loop: `PUT /drivers/me/availability`
 *     with the driver's current position. Required every time, not just once:
 *     the assignment engine drops a driver from its available pool the moment
 *     it assigns them an order (`DriverRegistry#markUnavailable`), so
 *     finishing a delivery (or declining/timing out an offer) leaves the
 *     driver un-registered until this fires again.
 *   - `OFFER_RECEIVED`: a live STOMP frame on
 *     `/topic/drivers/{driverId}/notifications` (hungry-notification), not a
 *     timer. Subscribed only while `phase === 'finding'`.
 *   - `ACCEPT_OFFER` / `DECLINE_OFFER`: `POST /api/deliveries/{id}/response`.
 *     A decline also re-registers availability (see above).
 *   - `toStore` → `orderReady`: a live proximity check (haversine distance to
 *     the store) replaces the old fixed timer — there is no backend signal
 *     for "the restaurant marked this ready" reaching the driver today (a
 *     real gap, not addressed here; see the module's own commit history).
 *   - `VALIDATE_ORDER` / `CONFIRM_DELIVERY`: `POST /api/deliveries/{id}/status`
 *     (`PICKED_UP` / `DELIVERED`).
 *
 * The offer auto-decline countdown is NOT a mock artifact — it stays exactly
 * as it was, a real UX affordance for "answer within N seconds."
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

  const goOnline = useCallback(() => {
    const position = location ?? courierRef.current;
    dispatch({ type: 'GO_ONLINE' });
    availabilityMutation.mutate(
      { available: true, latitude: position.latitude, longitude: position.longitude },
      {
        onError: (error) => {
          console.warn('[Session] Could not go online:', error);
          dispatch({ type: 'STOP_SESSION' });
        },
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- availabilityMutation.mutate is stable
  }, [location]);

  const stopSession = useCallback(() => {
    dispatch({ type: 'STOP_SESSION' });
    availabilityMutation.mutate({ available: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live offer reception. Gated on 'finding': the engine only ever offers one
  // order to an AVAILABLE driver, and this app only asks to be available
  // while actively looking.
  useEffect(() => {
    if (!driverId || phase !== 'finding') return;
    return subscribeToTopic(`/topic/drivers/${driverId}/notifications`, (payload) => {
      const offer = parseOrderAssignedPayload(payload);
      if (!offer) return;
      dispatch({ type: 'OFFER_RECEIVED', order: toSessionOrder(offer, courierRef.current) });
    });
  }, [driverId, phase]);

  const declineOffer = useCallback(() => {
    const current = order;
    dispatch({ type: 'DECLINE_OFFER' });
    if (current && driverId) {
      respondToDelivery(current.deliveryId, driverId, 'REJECTED').catch((error) => {
        console.warn('[Session] Could not decline the offer:', error);
      });
    }
    // Re-enter the available pool for the next match — see the module doc.
    const position = location ?? courierRef.current;
    availabilityMutation.mutate({ available: true, latitude: position.latitude, longitude: position.longitude });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, driverId, location]);

  // The auto-decline countdown — real UX, not a mock: an offer that goes
  // unanswered is declined on the driver's behalf.
  useEffect(() => {
    if (phase !== 'offer') return;
    const timer = setTimeout(declineOffer, OFFER_COUNTDOWN_MS);
    return () => clearTimeout(timer);
  }, [phase, declineOffer]);

  const acceptOffer = useCallback(() => {
    if (!order || !driverId) return;
    dispatch({ type: 'ACCEPT_OFFER' });
    respondToDelivery(order.deliveryId, driverId, 'ACCEPTED').catch((error) => {
      console.warn('[Session] Could not accept the offer:', error);
    });
  }, [order, driverId]);

  // Proximity replaces the old fixed timer — see the module doc for why.
  useEffect(() => {
    if (phase !== 'toStore' || !order || !location) return;
    if (haversine(location, order.store.coordinate) <= ARRIVAL_RADIUS_METERS) {
      dispatch({ type: 'ORDER_READY' });
    }
  }, [phase, order, location]);

  const validateOrder = useCallback(() => {
    if (!order || !driverId) return;
    dispatch({ type: 'VALIDATE_ORDER' });
    const position = location ?? courierRef.current;
    updateDeliveryStatus(order.deliveryId, driverId, order.orderId, 'PICKED_UP', position).catch((error) => {
      console.warn('[Session] Could not report pickup:', error);
    });
  }, [order, driverId, location]);

  const confirmDelivery = useCallback(() => {
    if (!order || !driverId) return;
    dispatch({ type: 'CONFIRM_DELIVERY' });
    const position = location ?? courierRef.current;
    updateDeliveryStatus(order.deliveryId, driverId, order.orderId, 'DELIVERED', position).catch((error) => {
      console.warn('[Session] Could not report delivery:', error);
    });
  }, [order, driverId, location]);

  // Back to looking, automatically, after a pause to show "Great work!" —
  // goes through the same real availability call goOnline does, since the
  // engine dropped this driver from its pool the moment it assigned them.
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
