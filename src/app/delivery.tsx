import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLocale } from '@/contexts/locale-context';
import { makeStyles } from '@/hooks/use-themed-styles';
import { useColors } from '@/contexts/theme-context';
import { DeliveryMap, type DeliveryMapHandle } from '@/components/map/delivery-map';
import { NavigateButton } from '@/components/overlays/navigate-button';
import { NavigationOverlay } from '@/components/overlays/navigation-overlay';
import { StatusPill } from '@/components/overlays/status-pill';
import { StopSessionButton } from '@/components/overlays/stop-session-button';
import { ActiveOrderSheet } from '@/components/sheets/active-order-sheet';
import { OfferCard } from '@/components/sheets/offer-card';
import { CircleButton } from '@/components/ui/circle-button';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Spacing } from '@/constants/theme';
import { getGoogleMapsApiKey } from '@/features/navigation/config';
import { fetchRoute, type NavRoute } from '@/features/navigation/routes-api';
import { useTurnByTurn } from '@/features/navigation/use-turn-by-turn';
import { getMapFocus } from '@/features/session/map-focus';
import { useSession } from '@/features/session/session-context';
import type { SessionPhase } from '@/features/session/types';

function openDialer(phone: string) {
  Linking.openURL(`tel:${phone}`);
}

function isActiveOrderPhase(
  phase: SessionPhase,
): phase is 'toStore' | 'orderReady' | 'toCustomer' | 'completed' {
  return (
    phase === 'toStore' ||
    phase === 'orderReady' ||
    phase === 'toCustomer' ||
    phase === 'completed'
  );
}

export default function DeliveryScreen() {
  const { t } = useLocale();
  const colors = useColors();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const session = useSession();
  const {
    phase,
    order,
    previewedLeg,
    sheetExpanded,
    accepting,
    actions,
    location,
    courier,
    nearCustomer,
  } = session;

  const mapRef = useRef<DeliveryMapHandle>(null);
  const [bottomInset, setBottomInset] = useState(0);
  const [mapType, setMapType] = useState<'standard' | 'hybrid'>('standard');
  const [navRoute, setNavRoute] = useState<NavRoute | null>(null);
  const [navLoading, setNavLoading] = useState(false);
  const [navDestKey, setNavDestKey] = useState<string | null>(null);

  const focus = useMemo(() => getMapFocus(session), [session]);

  // Switching legs (store → customer) or dropping the order ends live guidance.
  // Keyed on the destination itself and reset at render time — not in an effect —
  // so the toStore → orderReady tick (same destination) leaves navigation running.
  const destKey = focus.destination
    ? `${focus.destination.latitude},${focus.destination.longitude}`
    : null;
  if (destKey !== navDestKey) {
    setNavDestKey(destKey);
    setNavRoute(null);
  }

  const navigating = navRoute !== null;
  const guidance = useTurnByTurn(navRoute, navigating, location);

  const handleBottomLayout = useCallback((event: LayoutChangeEvent) => {
    setBottomInset(event.nativeEvent.layout.height);
  }, []);

  const handleRecenter = useCallback(() => mapRef.current?.recenter(), []);

  const handleHelp = useCallback(() => {
    Alert.alert(
      'Need a hand?',
      'Support is available 24/7 while you are on a shift.\nCall +216 71 000 000.',
    );
  }, []);

  /**
   * Fetches a road route from where the driver is right now to the current
   * leg's destination and enters navigation mode. `silent` is for the
   * automatic starts below — a failure there is logged and the driver keeps
   * the Navigate button to retry, rather than being ambushed by an alert.
   */
  const startNavigation = useCallback(
    async (silent = false) => {
      const destination = focus.destination;
      if (!destination) return;

      const apiKey = getGoogleMapsApiKey();
      if (!apiKey) {
        if (!silent) {
          Alert.alert(
            'Navigation unavailable',
            'The Google Maps API key is not configured. Set GOOGLE_MAPS_API_KEY and rebuild.',
          );
        }
        return;
      }

      setNavLoading(true);
      try {
        const route = await fetchRoute(location ?? courier, destination, apiKey);
        setNavRoute(route);
      } catch (error) {
        if (silent) {
          console.warn('[Navigation] Could not fetch a route:', error);
        } else {
          Alert.alert(
            'Could not start navigation',
            error instanceof Error ? error.message : 'Please try again.',
          );
        }
      } finally {
        setNavLoading(false);
      }
    },
    [focus.destination, location, courier],
  );

  const handleNavigatePress = useCallback(() => {
    void startNavigation(false);
  }, [startNavigation]);
  const stopNavigation = useCallback(() => setNavRoute(null), []);

  // Navigation mode starts by itself when a leg begins — on accepting the
  // offer (→ restaurant) and on confirming the pickup (→ customer) — once per
  // destination, so a driver who ends it deliberately is not thrown back in.
  const autoNavKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (phase !== 'toStore' && phase !== 'toCustomer') return;
    if (!destKey || autoNavKeyRef.current === destKey || navRoute || navLoading) return;
    autoNavKeyRef.current = destKey;
    void startNavigation(true);
  }, [phase, destKey, navRoute, navLoading, startNavigation]);

  // Leaving the route by more than the hook's off-route threshold fetches a
  // new one from the current position — at most every 20s, so a GPS hiccup
  // in a tunnel doesn't hammer the Routes API.
  const lastRerouteRef = useRef(0);
  const offRoute = navigating && guidance?.offRoute === true;
  useEffect(() => {
    if (!offRoute || navLoading) return;
    const now = Date.now();
    if (now - lastRerouteRef.current < 20_000) return;
    lastRerouteRef.current = now;
    void startNavigation(true);
  }, [offRoute, navLoading, startNavigation]);

  // Arrival ends navigation mode so the sheet — "Validate Order" at the
  // restaurant, "Confirm Delivery" at the customer — is what the driver sees
  // next. The session's own proximity checks (`orderReady` at the store,
  // `nearCustomer` at the drop-off) fire earlier than the route's last metres;
  // any of them closes the HUD.
  const arrived = navigating && guidance?.arrived === true;
  useEffect(() => {
    if (!arrived && phase !== 'orderReady' && !nearCustomer) return;
    if (!navigating) return;
    const timer = setTimeout(() => {
      setNavRoute(null);
      actions.setSheetExpanded(true);
    }, arrived ? 1_500 : 0);
    return () => clearTimeout(timer);
  }, [arrived, phase, nearCustomer, navigating, actions]);

  const toggleMapType = useCallback(() => {
    setMapType((current) => (current === 'standard' ? 'hybrid' : 'standard'));
  }, []);

  const handleToggleSheet = useCallback(() => {
    actions.setSheetExpanded(!sheetExpanded);
  }, [actions, sheetExpanded]);

  const openMenu = useCallback(() => router.push('/menu'), [router]);
  const openOrderNumber = useCallback(() => router.push('/order-number'), [router]);

  const showsRoute = focus.route.length > 1;
  // Guidance is only truthy once a route is loaded; it drives the nav HUD/camera.
  const navHud = navigating && guidance ? guidance : null;

  return (
    <View style={styles.screen}>
      <DeliveryMap
        ref={mapRef}
        focus={focus}
        location={location}
        courier={courier}
        bottomInset={bottomInset}
        mapType={mapType}
        pulsing={phase === 'finding'}
        navigation={
          navHud && navRoute
            ? { path: navRoute.path, position: navHud.position, heading: navHud.heading }
            : null
        }
      />

      {navHud ? <NavigationOverlay guidance={navHud} onExit={stopNavigation} /> : null}

      {/* ---------- top controls ---------- */}
      {!navHud ? (
        <>
      <View style={[styles.top, { paddingTop: insets.top + Spacing.two }]} pointerEvents="box-none">
        <View style={styles.topRow} pointerEvents="box-none">
          <CircleButton name="menu" accessibilityLabel={t('delivery.openMenu')} onPress={openMenu} />

          <View style={styles.pillColumn} pointerEvents="box-none">
            <StatusPill {...statusPillProps(t, phase)} />
            {phase === 'completed' ? (
              <StatusPill label={t('delivery.deliveryCompleted')} tone="teal" />
            ) : null}
            {phase === 'finding' ? <StopSessionButton onPress={actions.stopSession} /> : null}
          </View>

          <View style={styles.rightColumn} pointerEvents="box-none">
            <CircleButton
              name="help"
              accessibilityLabel={t('delivery.getHelp')}
              onPress={handleHelp}
            />
            {showsRoute ? (
              <CircleButton
                name="layers"
                accessibilityLabel={t('delivery.changeMapLayer')}
                onPress={toggleMapType}
                size={44}
                iconSize={20}
              />
            ) : null}
          </View>
        </View>
      </View>

      {/* ---------- bottom, phase by phase ---------- */}
      <View
        style={[styles.bottom, { paddingBottom: insets.bottom + Spacing.four }]}
        onLayout={handleBottomLayout}
        pointerEvents="box-none">
        {phase === 'offline' ? (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.offlineControls}>
            <PrimaryButton
              label={t('delivery.goOnline')}
              onPress={actions.goOnline}
              style={styles.goOnline}
            />
          </Animated.View>
        ) : null}

        {phase === 'finding' ? (
          <Animated.View entering={FadeIn} exiting={FadeOut} pointerEvents="box-none">
            <View style={styles.findingControls} pointerEvents="box-none">
              <CircleButton
                name="locate"
                accessibilityLabel={t('delivery.recentre')}
                onPress={handleRecenter}
                size={44}
                iconSize={20}
                background={colors.card}
                color={colors.orange}
              />
            </View>
          </Animated.View>
        ) : null}

        {phase === 'offer' && order ? (
          <View style={styles.padded}>
            <OfferCard
              order={order}
              previewedLeg={previewedLeg}
              accepting={accepting}
              onPreviewLeg={actions.previewLeg}
              onAccept={actions.acceptOffer}
              onDecline={actions.declineOffer}
            />
          </View>
        ) : null}

        {isActiveOrderPhase(phase) && order ? (
          <View style={styles.padded} pointerEvents="box-none">
            <View style={styles.navigate} pointerEvents="box-none">
              <NavigateButton onPress={handleNavigatePress} loading={navLoading} />
            </View>
            <ActiveOrderSheet
              order={order}
              phase={phase}
              expanded={sheetExpanded}
              onToggle={handleToggleSheet}
              onCall={openDialer}
              onOpenOrderNumber={openOrderNumber}
              onValidate={actions.validateOrder}
              canConfirmDelivery={nearCustomer}
              onConfirmDelivery={actions.confirmDelivery}
            />
          </View>
        ) : null}
      </View>
        </>
      ) : null}
    </View>
  );
}

function statusPillProps(t: ReturnType<typeof useLocale>['t'], phase: SessionPhase) {
  switch (phase) {
    case 'offline':
      return { label: t('delivery.offline') };
    case 'finding':
      return { label: t('delivery.findingOrders'), loading: true };
    case 'offer':
      return { label: t('delivery.orderFound'), tone: 'teal' as const };
    case 'toStore':
      return { label: 'Go near the store' as const, tone: 'teal' as const };
    case 'orderReady':
      return { label: 'Order is ready' as const, tone: 'teal' as const };
    case 'toCustomer':
      return { label: 'Customer is waiting !' as const, tone: 'teal' as const };
    case 'completed':
      return { label: 'Great Work !' as const, tone: 'teal' as const };
  }
}

const useStyles = makeStyles((c) => ({
  screen: {
    flex: 1,
    backgroundColor: c.background,
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.four,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  pillColumn: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.two,
  },
  rightColumn: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: Spacing.four,
  },
  padded: {
    paddingHorizontal: Spacing.four,
  },
  offlineControls: {
    alignItems: 'center',
  },
  goOnline: {
    minWidth: 200,
    paddingHorizontal: Spacing.six,
    height: 64,
  },
  findingControls: {
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.four,
  },
  navigate: {
    marginBottom: Spacing.three,
  },
}));
