import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Linking, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DeliveryMap, type DeliveryMapHandle } from '@/components/map/delivery-map';
import { BusyAreaBanner } from '@/components/overlays/busy-area-banner';
import { HotspotCarousel } from '@/components/overlays/hotspot-carousel';
import { NavigateButton } from '@/components/overlays/navigate-button';
import { NavigationOverlay } from '@/components/overlays/navigation-overlay';
import { StatusPill } from '@/components/overlays/status-pill';
import { StopSessionButton } from '@/components/overlays/stop-session-button';
import { ActiveOrderSheet } from '@/components/sheets/active-order-sheet';
import { OfferCard } from '@/components/sheets/offer-card';
import { CircleButton } from '@/components/ui/circle-button';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Text } from '@/components/ui/text';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
import { BUSY_PLACES, HOTSPOTS, OFFER_COUNTDOWN_MS } from '@/data/mock';
import { getGoogleMapsApiKey } from '@/features/navigation/config';
import { fetchRoute, type NavRoute } from '@/features/navigation/routes-api';
import { useTurnByTurn } from '@/features/navigation/use-turn-by-turn';
import { getMapFocus } from '@/features/session/map-focus';
import { useSession } from '@/features/session/session-context';
import type { BusyPlace, SessionPhase } from '@/features/session/types';
import { useCourierLocation } from '@/hooks/use-courier-location';

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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const session = useSession();
  const { phase, order, previewedLeg, sheetExpanded, actions } = session;
  const { granted, courier } = useCourierLocation();

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
  const guidance = useTurnByTurn(navRoute, navigating);

  const handleBottomLayout = useCallback((event: LayoutChangeEvent) => {
    setBottomInset(event.nativeEvent.layout.height);
  }, []);

  const handleBusyPlace = useCallback((place: BusyPlace) => {
    mapRef.current?.focusOn(place.coordinate);
  }, []);

  const handleRecenter = useCallback(() => mapRef.current?.recenter(), []);

  const handleHelp = useCallback(() => {
    Alert.alert(
      'Need a hand?',
      'Support is available 24/7 while you are on a shift.\nCall +216 71 000 000.',
    );
  }, []);

  const startNavigation = useCallback(async () => {
    const destination = focus.destination;
    if (!destination) return;

    const apiKey = getGoogleMapsApiKey();
    if (!apiKey) {
      Alert.alert(
        'Navigation unavailable',
        'The Google Maps API key is not configured. Set GOOGLE_MAPS_API_KEY and rebuild.',
      );
      return;
    }

    setNavLoading(true);
    try {
      const route = await fetchRoute(focus.origin ?? courier, destination, apiKey);
      setNavRoute(route);
    } catch (error) {
      Alert.alert(
        'Could not start navigation',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setNavLoading(false);
    }
  }, [focus.destination, focus.origin, courier]);

  const stopNavigation = useCallback(() => setNavRoute(null), []);

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
        hotspots={HOTSPOTS}
        courier={courier}
        bottomInset={bottomInset}
        showsUserLocation={granted}
        mapType={mapType}
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
          <CircleButton name="menu" accessibilityLabel="Open menu" onPress={openMenu} />

          <View style={styles.pillColumn} pointerEvents="box-none">
            <StatusPill {...statusPillProps(phase)} />
            {phase === 'completed' ? <StatusPill label="Delivery Completed" tone="teal" /> : null}
            {phase === 'finding' ? <StopSessionButton onPress={actions.stopSession} /> : null}
          </View>

          <View style={styles.rightColumn} pointerEvents="box-none">
            <CircleButton
              name="help"
              accessibilityLabel="Get help"
              onPress={handleHelp}
            />
            {showsRoute ? (
              <CircleButton
                name="layers"
                accessibilityLabel="Change map layer"
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
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.offlinePanel}>
            <PrimaryButton
              label="Go online"
              onPress={actions.goOnline}
              style={styles.goOnline}
            />
            <Text weight="bold" size={24} style={styles.shiftPrompt}>
              Working shifts Walla kifeh ?
            </Text>
          </Animated.View>
        ) : null}

        {phase === 'finding' ? (
          <Animated.View entering={FadeIn} exiting={FadeOut} pointerEvents="box-none">
            <View style={styles.findingControls} pointerEvents="box-none">
              <BusyAreaBanner />
              <CircleButton
                name="locate"
                accessibilityLabel="Recentre the map on me"
                onPress={handleRecenter}
                size={44}
                iconSize={20}
                background={Colors.white}
                color={Colors.orange}
              />
            </View>
            <View style={styles.carousel}>
              <HotspotCarousel places={BUSY_PLACES} onSelect={handleBusyPlace} />
            </View>
          </Animated.View>
        ) : null}

        {phase === 'offer' && order ? (
          <View style={styles.padded}>
            <OfferCard
              order={order}
              previewedLeg={previewedLeg}
              countdownMs={OFFER_COUNTDOWN_MS}
              onPreviewLeg={actions.previewLeg}
              onAccept={actions.acceptOffer}
              onDecline={actions.declineOffer}
            />
          </View>
        ) : null}

        {isActiveOrderPhase(phase) && order ? (
          <View style={styles.padded} pointerEvents="box-none">
            <View style={styles.navigate} pointerEvents="box-none">
              <NavigateButton onPress={startNavigation} loading={navLoading} />
            </View>
            <ActiveOrderSheet
              order={order}
              phase={phase}
              expanded={sheetExpanded}
              onToggle={handleToggleSheet}
              onCall={openDialer}
              onOpenOrderNumber={openOrderNumber}
              onValidate={actions.validateOrder}
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

function statusPillProps(phase: SessionPhase) {
  switch (phase) {
    case 'offline':
      return { label: 'Offline' as const };
    case 'finding':
      return { label: 'Finding orders' as const, loading: true };
    case 'offer':
      return { label: 'Order found !' as const, tone: 'teal' as const };
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
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
  offlinePanel: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    marginBottom: -Spacing.four,
    paddingBottom: Spacing.six,
    alignItems: 'center',
    ...Shadow.card,
  },
  goOnline: {
    minWidth: 200,
    paddingHorizontal: Spacing.six,
    height: 64,
    // Straddles the top edge of the panel, as in the Home frame.
    marginTop: -32,
  },
  shiftPrompt: {
    marginTop: Spacing.six,
    textAlign: 'center',
  },
  findingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  carousel: {
    marginTop: Spacing.four,
  },
  navigate: {
    marginBottom: Spacing.three,
  },
});
