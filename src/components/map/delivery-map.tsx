import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Polyline } from 'react-native-maps';

import { EtaBadge } from '@/components/map/eta-badge';
import { HotspotPill } from '@/components/map/hotspot-pill';
import { NavPuck } from '@/components/map/nav-puck';
import { CourierPuck, DestinationPin, OriginDot } from '@/components/map/route-endpoints';
import { Colors } from '@/constants/theme';
import { INITIAL_REGION } from '@/data/mock';
import type { MapFocus } from '@/features/session/map-focus';
import type { Hotspot, LatLng } from '@/features/session/types';

/** Active turn-by-turn overlay: the fetched route plus the moving courier. */
export type NavOverlay = {
  path: LatLng[];
  position: LatLng;
  heading: number;
};

export type DeliveryMapHandle = {
  /** Re-centre on the courier — the crosshair FAB on the Finding Orders frame. */
  recenter: () => void;
  /** Pan to a busy place picked from the carousel. */
  focusOn: (coordinate: LatLng) => void;
};

type Props = {
  ref?: Ref<DeliveryMapHandle>;
  focus: MapFocus;
  hotspots: Hotspot[];
  courier: LatLng;
  /** Height of whatever overlay covers the bottom of the map, so routes stay visible. */
  bottomInset: number;
  showsUserLocation: boolean;
  mapType: 'standard' | 'hybrid';
  /** When set, the map follows the courier in a tilted, heading-up nav camera. */
  navigation?: NavOverlay | null;
};

const TOP_INSET = 140;

export function DeliveryMap({
  ref,
  focus,
  hotspots,
  courier,
  bottomInset,
  showsUserLocation,
  mapType,
  navigation,
}: Props) {
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

  // Frame the leg — but not while navigating, when the follow camera owns it.
  useEffect(() => {
    if (!isReady || navActive) return;

    if (route.length > 1) {
      mapRef.current?.fitToCoordinates(route, {
        edgePadding: { top: TOP_INSET, right: 64, bottom: bottomInset + 32, left: 64 },
        animated: true,
      });
    } else {
      mapRef.current?.animateToRegion(INITIAL_REGION, 600);
    }
  }, [isReady, route, bottomInset, navActive]);

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
      onMapReady={() => setIsReady(true)}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={false}
      showsCompass={false}
      toolbarEnabled={false}
      loadingEnabled
      loadingBackgroundColor={Colors.background}>
      {focus.showHotspots
        ? hotspots.map((hotspot) => <HotspotPill key={hotspot.id} hotspot={hotspot} />)
        : null}

      {/* Casing under the stroke gives the route the same weight as in the frames. */}
      {navigation ? (
        <>
          <Polyline
            coordinates={navigation.path}
            strokeColor={Colors.routeCasing}
            strokeWidth={11}
            zIndex={1}
          />
          <Polyline
            coordinates={navigation.path}
            strokeColor={Colors.route}
            strokeWidth={7}
            zIndex={2}
          />
        </>
      ) : route.length > 1 ? (
        <>
          <Polyline
            coordinates={route}
            strokeColor={Colors.routeCasing}
            strokeWidth={11}
            zIndex={1}
          />
          <Polyline coordinates={route} strokeColor={Colors.route} strokeWidth={7} zIndex={2} />
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
      {focus.showHotspots ? <CourierPuck coordinate={courier} /> : null}
    </MapView>
  );
}
