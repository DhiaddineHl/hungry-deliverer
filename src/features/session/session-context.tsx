import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';

import {
  MOCK_ORDER,
  OFFER_COUNTDOWN_MS,
  TIME_TO_FIND_ORDER_MS,
  TIME_UNTIL_ORDER_READY_MS,
} from '@/data/mock';
import type { Order, RouteLeg, SessionState } from '@/features/session/types';

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
  | { type: 'SET_SHEET_EXPANDED'; expanded: boolean }
  | { type: 'FIND_NEXT' };

const INITIAL_STATE: SessionState = {
  phase: 'offline',
  order: null,
  previewedLeg: 'store',
  sheetExpanded: false,
};

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

    case 'FIND_NEXT':
      return { ...INITIAL_STATE, phase: 'finding' };

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

type SessionContextValue = SessionState & { actions: SessionActions };

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Single source of truth for the courier flow, and the seam to swap for a real
 * API: today the transitions below are driven by timers, tomorrow by a socket.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const { phase } = state;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (phase === 'finding') {
      timer = setTimeout(
        () => dispatch({ type: 'OFFER_RECEIVED', order: MOCK_ORDER }),
        TIME_TO_FIND_ORDER_MS,
      );
    } else if (phase === 'offer') {
      // The offer expires on its own — mirrors the countdown filling the CTA.
      timer = setTimeout(() => dispatch({ type: 'DECLINE_OFFER' }), OFFER_COUNTDOWN_MS);
    } else if (phase === 'toStore') {
      timer = setTimeout(() => dispatch({ type: 'ORDER_READY' }), TIME_UNTIL_ORDER_READY_MS);
    } else if (phase === 'completed') {
      timer = setTimeout(() => dispatch({ type: 'FIND_NEXT' }), 6_000);
    }

    return () => clearTimeout(timer);
  }, [phase]);

  const value = useMemo<SessionContextValue>(
    () => ({
      ...state,
      actions: {
        goOnline: () => dispatch({ type: 'GO_ONLINE' }),
        stopSession: () => dispatch({ type: 'STOP_SESSION' }),
        previewLeg: (leg) => dispatch({ type: 'PREVIEW_LEG', leg }),
        declineOffer: () => dispatch({ type: 'DECLINE_OFFER' }),
        acceptOffer: () => dispatch({ type: 'ACCEPT_OFFER' }),
        validateOrder: () => dispatch({ type: 'VALIDATE_ORDER' }),
        confirmDelivery: () => dispatch({ type: 'CONFIRM_DELIVERY' }),
        setSheetExpanded: (expanded) => dispatch({ type: 'SET_SHEET_EXPANDED', expanded }),
      },
    }),
    [state],
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
