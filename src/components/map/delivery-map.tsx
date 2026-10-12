import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Polyline } from 'react-native-maps';

import { DARK_MAP_STYLE } from '@/components/map/dark-map-style';
import { LIGHT_MAP_STYLE } from '@/components/map/light-map-style';
import { EtaChip, MapMarker, RiderDot } from '@/components/map/markers';
import { NavPuck } from '@/components/map/nav-puck';
import { SignalPulse } from '@/components/map/signal-pulse';
import { INITIAL_REGION } from '@/data/mock';
import type { MapFocus } from '@/features/session/map-focus';
import type { LatLng } from '@/features/session/types';
import { useTheme } from '@/theme';

/** Active turn-by-turn overlay: the fetched route plus the moving rider. */
export type NavOverlay = {
  path: LatLng[];
  position: LatLng;
  heading: number;
};

export type DeliveryMapHandle = {
  /** Re-centre on the rider — the locate button. */
  recenter: () => void;
  focusOn: (coordinate: LatLng) => void;
};

type Props = {
  ref?: Ref<DeliveryMapHandle>;
  focus: MapFocus;
  /** The device's real position, or `null` until the first GPS fix. */
  location: LatLng | null;
  /** `location` with the demo fallback — what recentring anchors on. */
  courier: LatLng;
  /** Height of the sheet covering the bottom of the map, so routes stay visible. */
  bottomInset: number;
  /** When set, the map follows the rider in a tilted, heading-up camera. */
  navigation?: NavOverlay | null;
  /** Orange rings ripple out from the rider while looking for orders. */
  pulsing?: boolean;
};

/**
 * Markers and routes are kept clear of the floating top bar and the sheet:
 * framing uses edge padding of 140 at the top, 40 at the sides and the sheet's
 * height at the bottom (DRIVER_APP.md §3).
 */
const EDGE = { top: 140, side: 40 };

export function DeliveryMap({ ref, focus, location, courier, bottomInset, navigation, pulsing = false }: Props) {
  const { colors, isDark } = useTheme();
  const mapRef = useRef<MapView>(null);
  const [isReady, setIsReady] = useState(false);
  const navActive = navigation != null;
  const navLat = navigation?.position.latitude;
  const navLng = navigation?.position.longitude;
  const navHeading = navigation?.heading;

  const focusOn = useCallback((coordinate: LatLng) => {
    mapRef.current?.animateToRegion({ ...coordinate, latitudeDelta: 0.012, longitudeDelta: 0.01 }, 500);
  }, []);

  const recenter = useCallback(() => focusOn(courier), [courier, focusOn]);

  useImperativeHandle(ref, () => ({ recenter, focusOn }), [recenter, focusOn]);

  const { route, nextRoute } = focus;
  const hasRoute = route.length > 1;

  // Read in effects that should not re-run on each GPS tick.
  const courierRef = useRef(courier);
  useEffect(() => {
    courierRef.current = courier;
  }, [courier]);

  // Frame the leg(s) — but not while navigating, when the follow camera owns
  // it. With nothing drawn, sit on the rider (or the city fallback before a fix).
  useEffect(() => {
    if (!isReady || navActive) return;
    if (hasRoute) {
      mapRef.current?.fitToCoordinates([...route, ...nextRoute], {
        edgePadding: { top: EDGE.top, right: EDGE.side, bottom: bottomInset + 32, left: EDGE.side },
        animated: true,
      });
    } else {
      mapRef.current?.animateToRegion(
        { ...courierRef.current, latitudeDelta: 0.012, longitudeDelta: 0.01 },
        600
      );
    }
    // Deliberately not keyed on the courier: the map must not chase every GPS
    // tick while the rider pans around.
  }, [isReady, route, nextRoute, hasRoute, bottomInset, navActive]);

  // Jump from the city view to the rider the moment the first real fix lands.
  const centredOnFixRef = useRef(false);
  useEffect(() => {
    if (!isReady || !location || centredOnFixRef.current || navActive || hasRoute) return;
    centredOnFixRef.current = true;
    focusOn(location);
  }, [isReady, location, navActive, hasRoute, focusOn]);

  // Chase the rider: recentre and rotate to the heading on every position tick.
  useEffect(() => {
    if (!isReady || !navActive || navLat == null || navLng == null) return;
    mapRef.current?.animateCamera(
      { center: { latitude: navLat, longitude: navLng }, heading: navHeading, pitch: 50, zoom: 17 },
      { duration: 400 }
    );
  }, [isReady, navActive, navLat, navLng, navHeading]);

  const activePath = navigation?.path ?? (hasRoute ? route : null);

  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_GOOGLE}
      style={StyleSheet.absoluteFill}
      initialRegion={INITIAL_REGION}
      customMapStyle={isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE}
      onMapReady={() => setIsReady(true)}
      // Off: the RiderDot below is the rider's marker; the native blue dot
      // would sit under it as a duplicate.
      showsUserLocation={false}
      showsMyLocationButton={false}
      showsCompass={false}
      showsPointsOfInterests={false}
      toolbarEnabled={false}
      loadingEnabled
      loadingBackgroundColor={colors.background}>
      {/* The upcoming leg, under the active one: dotted, thinner. */}
      {!navigation && nextRoute.length > 1 ? (
        <Polyline
          coordinates={nextRoute}
          strokeColor={colors.routeNext}
          strokeWidth={4}
          lineCap="round"
          lineDashPattern={[1, 9]}
          zIndex={1}
        />
      ) : null}

      {/* White casing, then the navy line — the active leg reads on any tile. */}
      {activePath ? (
        <>
          <Polyline coordinates={activePath} strokeColor={colors.routeCasing} strokeWidth={10} lineCap="round" lineJoin="round" zIndex={2} />
          <Polyline coordinates={activePath} strokeColor={colors.route} strokeWidth={5} lineCap="round" lineJoin="round" zIndex={3} />
        </>
      ) : null}

      {focus.markers.map((marker) => (
        <MapMarker
          key={`${marker.kind}-${marker.label ?? ''}`}
          kind={marker.kind}
          coordinate={marker.coordinate}
          label={marker.label}
        />
      ))}

      {focus.etaCoordinate && focus.etaMinutes && !navigation ? (
        <EtaChip coordinate={focus.etaCoordinate} minutes={focus.etaMinutes} />
      ) : null}

      {navigation ? <NavPuck coordinate={navigation.position} heading={navigation.heading} /> : null}
      {/* Only a real fix earns a marker — never the city fallback. */}
      {!navigation && location && pulsing ? <SignalPulse coordinate={location} /> : null}
      {!navigation && location ? <RiderDot coordinate={location} /> : null}
    </MapView>
  );
}
