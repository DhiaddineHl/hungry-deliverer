import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { View } from 'react-native';
import { Marker } from 'react-native-maps';

import { makeStyles } from '@/hooks/use-themed-styles';
import { useColors } from '@/contexts/theme-context';
import { useTracksViewChanges } from '@/components/map/use-tracks-view-changes';
import type { LatLng } from '@/features/session/types';

/** Gray puck at the start of the drawn leg. */
export const OriginDot = memo(function OriginDot({ coordinate }: { coordinate: LatLng }) {
  const styles = useStyles();
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
  const colors = useColors();
  const styles = useStyles();
  const tracksViewChanges = useTracksViewChanges();

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.85 }}
      tracksViewChanges={tracksViewChanges}
      tappable={false}
      zIndex={4}>
      <View style={styles.destination}>
        <Ionicons name="location" size={40} color={colors.pin} />
        <View style={styles.destinationDot} />
      </View>
    </Marker>
  );
});

/** The courier's own position — blue dot with an accuracy halo. */
export const CourierPuck = memo(function CourierPuck({ coordinate }: { coordinate: LatLng }) {
  const styles = useStyles();
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

const useStyles = makeStyles((c) => ({
  origin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: c.origin,
    borderWidth: 3,
    borderColor: c.white,
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
    backgroundColor: c.white,
    borderWidth: 2,
    borderColor: c.origin,
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
    backgroundColor: c.etaBadge,
    borderWidth: 3,
    borderColor: c.white,
  },
}));
