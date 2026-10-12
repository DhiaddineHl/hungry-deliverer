import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DeliveryMap, type DeliveryMapHandle } from '@/components/map/delivery-map';
import { NavigateButton } from '@/components/overlays/navigate-button';
import { NavigationOverlay } from '@/components/overlays/navigation-overlay';
import { StatusPill } from '@/components/overlays/status-pill';
import { ActiveOrderSheet, type TripPhase } from '@/components/sheets/active-order-sheet';
import { OfferCard } from '@/components/sheets/offer-card';
import { FindingSheet, OfflineSheet } from '@/components/sheets/session-sheets';
import { TripComplete } from '@/components/sheets/trip-complete';
import { MapSheet } from '@/components/sheets/trip-parts';
import { IconButton } from '@/components/ui/icon-button';
import { ThemedStatusBar } from '@/components/ui/themed-status-bar';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/contexts/auth-context';
import { useLocale } from '@/contexts/locale-context';
import { getGoogleMapsApiKey } from '@/features/navigation/config';
import { fetchRoute, type NavRoute } from '@/features/navigation/routes-api';
import { useTurnByTurn } from '@/features/navigation/use-turn-by-turn';
import { getMapFocus } from '@/features/session/map-focus';
import { useSession } from '@/features/session/session-context';
import type { SessionPhase } from '@/features/session/types';
import { useDriver } from '@/hooks/use-driver';
import { makeStyles, type ColorToken } from '@/theme';

function isTripPhase(phase: SessionPhase): phase is TripPhase {
  return phase === 'toStore' || phase === 'orderReady' || phase === 'toCustomer';
}

/**
 * Minutes the rider has been online, refreshed every 30 s. Counting starts
 * when `online` turns true and resets when it turns false.
 */
function useOnlineMinutes(online: boolean) {
  const [minutes, setMinutes] = useState(0);
  useEffect(() => {
    if (!online) return;
    const since = Date.now();
    const timer = setInterval(() => setMinutes((Date.now() - since) / 60_000), 30_000);
    return () => {
      clearInterval(timer);
      setMinutes(0);
    };
  }, [online]);
  return online ? minutes : 0;
}

/**
 * The map screen (D1–D9). A full-bleed map with a floating top bar and one
 * bottom sheet; everything on it is derived from the session phase — the map
 * is never navigated away from between states, only redrawn.
 */
export default function DeliveryScreen() {
  const { t } = useLocale();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showToast = useToast((state) => state.show);
  const session = useSession();
  const {
    phase,
    order,
    sheetExpanded,
    accepting,
    actions,
    location,
    courier,
    nearCustomer,
    locationGranted,
    canGoOnline,
    goOnlineFailed,
    reportPending,
    reportFailed,
  } = session;
  const { user } = useAuth();
  const { data: driver } = useDriver(user?.sub);

  // GPS starts with this screen, not with the app: the session provider only
  // asks for location permission once the signed-in rider reaches the map.
  // Screens pushed on top leave this mounted, so the watch keeps running.
  const { setMapOpen } = actions;
  useEffect(() => {
    setMapOpen(true);
    return () => setMapOpen(false);
  }, [setMapOpen]);

  const mapRef = useRef<DeliveryMapHandle>(null);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [navRoute, setNavRoute] = useState<NavRoute | null>(null);
  const [navLoading, setNavLoading] = useState(false);
  const [navDestKey, setNavDestKey] = useState<string | null>(null);

  const focus = useMemo(() => getMapFocus(session), [session]);

  // ---- online duration (D2) -------------------------------------------------
  const onlineMinutes = useOnlineMinutes(phase !== 'offline');

  // ---- offer outcome toasts (D3) --------------------------------------------
  // An offer that leaves the table without the rider tapping Decline either ran
  // out of time or was lost to the accept race; say which.
  const declinedRef = useRef(false);
  const previousRef = useRef<{ phase: SessionPhase; expiresAt: number | null }>({ phase, expiresAt: null });
  useEffect(() => {
    const previous = previousRef.current;
    if (previous.phase === 'offer' && phase === 'finding' && !declinedRef.current) {
      const expired = previous.expiresAt !== null && Date.now() >= previous.expiresAt - 1000;
      showToast(expired ? t('delivery.offerExpired') : t('delivery.offerTaken'), { raised: true });
    }
    if (phase !== 'offer') declinedRef.current = false;
    previousRef.current = { phase, expiresAt: order?.expiresAt ?? null };
  }, [phase, order, showToast, t]);

  const handleDecline = useCallback(() => {
    declinedRef.current = true;
    actions.declineOffer();
  }, [actions]);

  // ---- turn-by-turn ---------------------------------------------------------
  // Switching legs ends live guidance. Keyed on the destination and reset at
  // render time, so the toStore → orderReady tick (same destination) keeps it.
  const destKey = focus.destination ? `${focus.destination.latitude},${focus.destination.longitude}` : null;
  if (destKey !== navDestKey) {
    setNavDestKey(destKey);
    setNavRoute(null);
  }

  const navigating = navRoute !== null;
  const guidance = useTurnByTurn(navRoute, navigating, location);

  const startNavigation = useCallback(
    async (silent = false) => {
      const destination = focus.destination;
      if (!destination) return;
      const apiKey = getGoogleMapsApiKey();
      if (!apiKey) {
        if (!silent) Alert.alert(t('delivery.navUnavailableTitle'), t('delivery.navUnavailableBody'));
        return;
      }
      setNavLoading(true);
      try {
        setNavRoute(await fetchRoute(location ?? courier, destination, apiKey));
      } catch (error) {
        if (silent) { if (__DEV__) console.warn('[Navigation] Could not fetch a route:', error); }
        else Alert.alert(t('delivery.navFailedTitle'), t('delivery.navFailedBody'));
      } finally {
        setNavLoading(false);
      }
    },
    [focus.destination, location, courier, t]
  );

  // Guidance starts by itself when a leg begins — on accepting and on pickup —
  // once per destination, so a rider who ends it is not thrown back in.
  const autoNavKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (phase !== 'toStore' && phase !== 'toCustomer') return;
    if (!destKey || autoNavKeyRef.current === destKey || navRoute || navLoading) return;
    autoNavKeyRef.current = destKey;
    void startNavigation(true);
  }, [phase, destKey, navRoute, navLoading, startNavigation]);

  // Off route: fetch a new one from here, at most every 20 s.
  const lastRerouteRef = useRef(0);
  const offRoute = navigating && guidance?.offRoute === true;
  useEffect(() => {
    if (!offRoute || navLoading) return;
    const now = Date.now();
    if (now - lastRerouteRef.current < 20_000) return;
    lastRerouteRef.current = now;
    void startNavigation(true);
  }, [offRoute, navLoading, startNavigation]);

  // Arrival (route end, or the session's own proximity checks) closes the HUD
  // so the sheet — the bag check, the slider — is what the rider sees next.
  const arrived = navigating && guidance?.arrived === true;
  useEffect(() => {
    if (!arrived && phase !== 'orderReady' && !nearCustomer) return;
    if (!navigating) return;
    const timer = setTimeout(
      () => {
        setNavRoute(null);
        actions.setSheetExpanded(true);
      },
      arrived ? 1_500 : 0
    );
    return () => clearTimeout(timer);
  }, [arrived, phase, nearCustomer, navigating, actions]);

  // ---- Android back -----------------------------------------------------------
  // Collapses the sheet first; never leaves an active trip.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (isTripPhase(phase) && sheetExpanded) {
          actions.setSheetExpanded(false);
          return true;
        }
        return isTripPhase(phase) || phase === 'offer';
      });
      return () => subscription.remove();
    }, [phase, sheetExpanded, actions])
  );

  const onSheetLayout = useCallback((event: LayoutChangeEvent) => {
    setSheetHeight(event.nativeEvent.layout.height);
  }, []);

  const navHud = navigating && guidance ? guidance : null;
  const completed = phase === 'completed' && order;
  const showTopBar = !navHud && phase !== 'offer' && !completed;
  const showSheet = !navHud && !completed;
  const pill = statusPill(t, phase, nearCustomer, order?.expectedArrival);

  return (
    <View style={styles.screen}>
      <ThemedStatusBar />
      <DeliveryMap
        ref={mapRef}
        focus={focus}
        location={location}
        courier={courier}
        bottomInset={showSheet ? sheetHeight : 0}
        pulsing={phase === 'finding'}
        navigation={navHud && navRoute ? { path: navRoute.path, position: navHud.position, heading: navHud.heading } : null}
      />

      {/* The offer takes focus: the map dims behind it. */}
      {phase === 'offer' ? (
        <Animated.View entering={FadeIn} exiting={FadeOut} pointerEvents="none" style={styles.scrim} />
      ) : null}

      {navHud ? <NavigationOverlay guidance={navHud} onExit={() => setNavRoute(null)} /> : null}

      {showTopBar ? (
        <View style={[styles.topBar, { top: insets.top + 6 }]} pointerEvents="box-none">
          <IconButton
            name="menu"
            variant="floating"
            accessibilityLabel={t('delivery.openMenu')}
            onPress={() => router.push('/menu')}
          />
          <StatusPill label={pill.label} lead={pill.lead} />
          <IconButton
            name="help"
            variant="floating"
            accessibilityLabel={t('delivery.getHelp')}
            onPress={() => router.push('/faqs')}
          />
        </View>
      ) : null}

      {showSheet ? (
        <View style={styles.bottom} pointerEvents="box-none">
          {phase !== 'offer' ? (
            <View style={styles.floating} pointerEvents="box-none">
              {isTripPhase(phase) ? (
                <NavigateButton onPress={() => void startNavigation(false)} loading={navLoading} />
              ) : (
                <View />
              )}
              <IconButton
                name="locate"
                variant="floating"
                accessibilityLabel={t('delivery.recentre')}
                onPress={() => mapRef.current?.recenter()}
              />
            </View>
          ) : null}

          <MapSheet
            onLayout={onSheetLayout}
            gap={phase === 'offline' || phase === 'finding' ? 16 : 14}
            onGrabberPress={isTripPhase(phase) ? () => actions.setSheetExpanded(!sheetExpanded) : undefined}
            grabberLabel={sheetExpanded ? t('delivery.collapseSheet') : t('delivery.expandSheet')}>
            {phase === 'offline' ? (
              <OfflineSheet
                vehicle={driver?.vehicle}
                locationGranted={locationGranted}
                canGoOnline={canGoOnline}
                failed={goOnlineFailed}
                onGoOnline={actions.goOnline}
                onChangeVehicle={() => router.push('/settings')}
              />
            ) : null}
            {phase === 'finding' ? <FindingSheet onlineMinutes={onlineMinutes} onGoOffline={actions.stopSession} /> : null}
            {phase === 'offer' && order ? (
              <OfferCard order={order} accepting={accepting} onAccept={actions.acceptOffer} onDecline={handleDecline} />
            ) : null}
            {isTripPhase(phase) && order ? (
              <ActiveOrderSheet
                key={order.orderId}
                order={order}
                phase={phase}
                expanded={sheetExpanded}
                onToggle={() => actions.setSheetExpanded(!sheetExpanded)}
                nearCustomer={nearCustomer}
                onConfirmPickup={actions.validateOrder}
                onConfirmDelivery={actions.confirmDelivery}
                onShowOrderNumber={() => router.push('/order-number')}
                reportPending={reportPending}
                reportFailed={reportFailed}
              />
            ) : null}
          </MapSheet>
        </View>
      ) : null}

      {completed ? (
        <TripComplete order={order} onFindNext={actions.goOnline} onGoOffline={actions.stopSession} />
      ) : null}
    </View>
  );
}

function statusPill(
  t: ReturnType<typeof useLocale>['t'],
  phase: SessionPhase,
  nearCustomer: boolean,
  expectedArrival: string | undefined
): { label: string; lead: ColorToken | 'spinner' } {
  switch (phase) {
    case 'offline':
      return { label: t('delivery.statusOffline'), lead: 'inkSubtle' };
    case 'finding':
    case 'offer':
      return { label: t('delivery.statusFinding'), lead: 'spinner' };
    case 'toStore':
      return { label: t('delivery.statusToStore'), lead: 'primary' };
    case 'orderReady':
      return { label: t('delivery.statusAtStore'), lead: 'success' };
    case 'toCustomer':
      return nearCustomer || !expectedArrival
        ? { label: t('delivery.statusWaiting'), lead: 'primary' }
        : { label: t('delivery.statusDeliverBy', { time: expectedArrival }), lead: 'primary' };
    case 'completed':
      return { label: t('delivery.statusFinding'), lead: 'spinner' };
  }
}

const useStyles = makeStyles((c, t) => ({
  screen: {
    flex: 1,
    backgroundColor: c.background,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: c.scrim,
  },
  topBar: {
    position: 'absolute',
    left: t.chromePadding,
    right: t.chromePadding,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  floating: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: t.chromePadding,
    marginBottom: 16,
  },
}));
