import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { useTracksViewChanges } from '@/components/map/use-tracks-view-changes';
import { Colors } from '@/constants/theme';
import type { LatLng } from '@/features/session/types';

/** Gray puck at the start of the drawn leg. */
export const OriginDot = memo(function OriginDot({ coordinate }: { coordinate: LatLng }) {
  const tracksViewChanges = useTracksViewChanges();

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracksViewChanges}
      tappable={false}
      zIndex={2}>
      <View style={styles.origin} />
    </Marker>
  );
});

/** Red teardrop pin over a white dot, as drawn in the route frames. */
export const DestinationPin = memo(function DestinationPin({
  coordinate,
}: {
  coordinate: LatLng;
}) {
  const tracksViewChanges = useTracksViewChanges();

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.85 }}
      tracksViewChanges={tracksViewChanges}
      tappable={false}
      zIndex={4}>
      <View style={styles.destination}>
        <Ionicons name="location" size={40} color={Colors.pin} />
        <View style={styles.destinationDot} />
      </View>
    </Marker>
  );
});

/** The courier's own position — blue dot with an accuracy halo. */
export const CourierPuck = memo(function CourierPuck({ coordinate }: { coordinate: LatLng }) {
  const tracksViewChanges = useTracksViewChanges();

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracksViewChanges}
      tappable={false}
      zIndex={5}>
      <View style={styles.halo}>
        <View style={styles.puck} />
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  origin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.origin,
    borderWidth: 3,
    borderColor: Colors.white,
  },
  destination: {
    alignItems: 'center',
  },
  destinationDot: {
    position: 'absolute',
    bottom: -5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.origin,
  },
  halo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(66,133,244,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  puck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1A73E8',
    borderWidth: 3,
    borderColor: Colors.white,
  },
});
