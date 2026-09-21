import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Polyline } from 'react-native-maps';

import { DARK_MAP_STYLE } from '@/components/map/dark-map-style';
import { useTheme } from '@/contexts/theme-context';
import { EtaBadge } from '@/components/map/eta-badge';
import { NavPuck } from '@/components/map/nav-puck';
import { CourierPuck, DestinationPin, OriginDot } from '@/components/map/route-endpoints';
import { SignalPulse } from '@/components/map/signal-pulse';
import { INITIAL_REGION } from '@/data/mock';
import type { MapFocus } from '@/features/session/map-focus';
import type { LatLng } from '@/features/session/types';

/** Active turn-by-turn overlay: the fetched route plus the moving courier. */
export type NavOverlay = {
  path: LatLng[];
  position: LatLng;
  heading: number;
};

export type DeliveryMapHandle = {
  /** Re-centre on the courier — the crosshair FAB on the Finding Orders frame. */
  recenter: () => void;
  /** Pan to an arbitrary point. */
  focusOn: (coordinate: LatLng) => void;
};

type Props = {
  ref?: Ref<DeliveryMapHandle>;
  focus: MapFocus;
  /** The device's real position, or `null` until the first GPS fix. */
  location: LatLng | null;
  /** `location` with the demo fallback — what routes and recentring anchor on. */
  courier: LatLng;
  /** Height of whatever overlay covers the bottom of the map, so routes stay visible. */
  bottomInset: number;
  mapType: 'standard' | 'hybrid';
  /** When set, the map follows the courier in a tilted, heading-up nav camera. */
  navigation?: NavOverlay | null;
  /** Rings ripple out from the courier — on while the driver is online and waiting for an offer. */
  pulsing?: boolean;
};

const TOP_INSET = 140;

export function DeliveryMap({
  ref,
  focus,
  location,
  courier,
  bottomInset,
  mapType,
  navigation,
  pulsing = false,
}: Props) {
  const { colors, isDark } = useTheme();
  const mapRef = useRef<MapView>(null);
  const [isReady, setIsReady] = useState(false);
  const navActive = navigation != null;
  const navLat = navigation?.position.latitude;
  const navLng = navigation?.position.longitude;
  const navHeading = navigation?.heading;

  const focusOn = useCallback((coordinate: LatLng) => {
    mapRef.current?.animateToRegion(
      { ...coordinate, latitudeDelta: 0.012, longitudeDelta: 0.01 },
      500,
    );
  }, []);

  const recenter = useCallback(() => focusOn(courier), [courier, focusOn]);

  useImperativeHandle(ref, () => ({ recenter, focusOn }), [recenter, focusOn]);

  const { route } = focus;
  const hasRoute = route.length > 1;

  // Read in effects that should not re-run on each GPS tick.
  const courierRef = useRef(courier);
  useEffect(() => {
    courierRef.current = courier;
  }, [courier]);

  // Frame the leg — but not while navigating, when the follow camera owns it.
  // With no leg drawn, sit on the driver (or the demo fallback before a fix).
  useEffect(() => {
    if (!isReady || navActive) return;

    if (hasRoute) {
      mapRef.current?.fitToCoordinates(route, {
        edgePadding: { top: TOP_INSET, right: 64, bottom: bottomInset + 32, left: 64 },
        animated: true,
      });
    } else {
      mapRef.current?.animateToRegion(
        { ...courierRef.current, latitudeDelta: 0.012, longitudeDelta: 0.01 },
        600,
      );
    }
    // Deliberately not keyed on the courier: the map must not chase every GPS
    // tick while the driver pans around — the first fix below handles that.
  }, [isReady, route, hasRoute, bottomInset, navActive]);

  // Jump from the fallback city view to the driver the moment the first real
  // fix lands, once — later ticks only move the marker.
  const centredOnFixRef = useRef(false);
  useEffect(() => {
    if (!isReady || !location || centredOnFixRef.current || navActive || hasRoute) return;
    centredOnFixRef.current = true;
    focusOn(location);
  }, [isReady, location, navActive, hasRoute, focusOn]);

  // Chase the courier: recentre and rotate to the heading on every position tick.
  useEffect(() => {
    if (!isReady || !navActive || navLat == null || navLng == null) return;

    mapRef.current?.animateCamera(
      {
        center: { latitude: navLat, longitude: navLng },
        heading: navHeading,
        pitch: 50,
        zoom: 17,
      },
      { duration: 400 },
    );
  }, [isReady, navActive, navLat, navLng, navHeading]);

  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_GOOGLE}
      style={StyleSheet.absoluteFill}
      initialRegion={INITIAL_REGION}
      mapType={mapType}
      // Only for the standard tiles: satellite imagery has no styleable
      // geometry, and a style over it is at best ignored.
      customMapStyle={isDark && mapType === 'standard' ? DARK_MAP_STYLE : undefined}
      onMapReady={() => setIsReady(true)}
      // Off: the CourierPuck below is the driver's marker; the native blue dot
      // would sit under it as a duplicate.
      showsUserLocation={false}
      showsMyLocationButton={false}
      showsCompass={false}
      toolbarEnabled={false}
      loadingEnabled
      loadingBackgroundColor={colors.background}>
      {/* Casing under the stroke gives the route the same weight as in the frames. */}
      {navigation ? (
        <>
          <Polyline
            coordinates={navigation.path}
            strokeColor={colors.routeCasing}
            strokeWidth={11}
            zIndex={1}
          />
          <Polyline
            coordinates={navigation.path}
            strokeColor={colors.route}
            strokeWidth={7}
            zIndex={2}
          />
        </>
      ) : route.length > 1 ? (
        <>
          <Polyline
            coordinates={route}
            strokeColor={colors.routeCasing}
            strokeWidth={11}
            zIndex={1}
          />
          <Polyline coordinates={route} strokeColor={colors.route} strokeWidth={7} zIndex={2} />
        </>
      ) : null}

      {focus.origin && !navigation ? <OriginDot coordinate={focus.origin} /> : null}
      {focus.destination ? <DestinationPin coordinate={focus.destination} /> : null}
      {focus.etaCoordinate && focus.etaMinutes && !navigation ? (
        <EtaBadge coordinate={focus.etaCoordinate} minutes={focus.etaMinutes} />
      ) : null}

      {navigation ? (
        <NavPuck coordinate={navigation.position} heading={navigation.heading} />
      ) : null}
      {/* Only a real fix earns a marker — never the demo fallback point. */}
      {focus.showCourier && location && pulsing ? <SignalPulse coordinate={location} /> : null}
      {focus.showCourier && location ? <CourierPuck coordinate={location} /> : null}
    </MapView>
  );
}
