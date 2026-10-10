import { memo } from 'react';
import { View } from 'react-native';
import { Marker } from 'react-native-maps';

import { useTracksViewChanges } from '@/components/map/use-tracks-view-changes';
import { Text } from '@/components/ui/text';
import type { LatLng } from '@/features/session/types';
import { Icon, makeStyles } from '@/theme';

/**
 * The rider's own position: a 64 pt navy halo, a 22 pt white disc and a 14 pt
 * navy dot. Custom marker views stop tracking changes once painted, so only
 * the coordinate moves on a GPS tick — the bitmap is never redrawn.
 */
export const RiderDot = memo(function RiderDot({ coordinate }: { coordinate: LatLng }) {
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
        <View style={styles.outer}>
          <View style={styles.inner} />
        </View>
      </View>
    </Marker>
  );
});

/**
 * Pickup (store) or drop-off (customer): a 36 pt navy disc with a white
 * border and icon, a 3×8 stem under it, and an optional name label to the
 * right. Anchored at the stem's tip so the point sits exactly on the address.
 */
export const MapMarker = memo(function MapMarker({
  coordinate,
  kind,
  label,
}: {
  coordinate: LatLng;
  kind: 'store' | 'customer';
  label?: string;
}) {
  const styles = useStyles();
  const tracksViewChanges = useTracksViewChanges();
  return (
    <Marker
      coordinate={coordinate}
      // Anchored at the stem tip. A marker anchor is a fraction of the whole
      // bitmap, so the label is mirrored by an invisible twin on the left:
      // the row stays symmetric and the stem stays at x = 0.5.
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={tracksViewChanges}
      tappable={false}
      zIndex={4}>
      <View style={styles.markerRow}>
        {label ? (
          <View style={[styles.label, styles.ghost]}>
            <Text variant="badge" numberOfLines={1}>
              {label}
            </Text>
          </View>
        ) : null}
        <View style={styles.markerColumn}>
          <View style={styles.disc}>
            <Icon name={kind} size="small" color="onInk" />
          </View>
          <View style={styles.stem} />
        </View>
        {label ? (
          <View style={styles.label}>
            <Text variant="badge" numberOfLines={1}>
              {label}
            </Text>
          </View>
        ) : null}
      </View>
    </Marker>
  );
});

/** The navy "3 min" chip at the route midpoint. */
export const EtaChip = memo(function EtaChip({ coordinate, minutes }: { coordinate: LatLng; minutes: number }) {
  const styles = useStyles();
  const tracksViewChanges = useTracksViewChanges();
  return (
    <Marker
      coordinate={coordinate}
      // Offset up-right of the midpoint so the chip never sits on the line.
      anchor={{ x: -0.15, y: 1.3 }}
      tracksViewChanges={tracksViewChanges}
      tappable={false}
      zIndex={3}>
      <View style={styles.eta}>
        <Text variant="metaStrong" color="onInk">
          {minutes} min
        </Text>
      </View>
    </Marker>
  );
});

const useStyles = makeStyles((c, t) => ({
  halo: {
    width: t.size.riderDot.halo,
    height: t.size.riderDot.halo,
    borderRadius: t.size.riderDot.halo / 2,
    backgroundColor: c.riderHalo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outer: {
    width: t.size.riderDot.outer,
    height: t.size.riderDot.outer,
    borderRadius: t.size.riderDot.outer / 2,
    backgroundColor: c.knob,
    alignItems: 'center',
    justifyContent: 'center',
    ...t.shadow.floatingButton,
  },
  inner: {
    width: t.size.riderDot.inner,
    height: t.size.riderDot.inner,
    borderRadius: t.size.riderDot.inner / 2,
    backgroundColor: c.brand,
  },
  markerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    // Room for the disc's shadow, which a marker bitmap would otherwise clip;
    // no bottom padding, so the stem tip is the bitmap's bottom edge.
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  markerColumn: {
    alignItems: 'center',
  },
  disc: {
    width: t.size.mapMarker,
    height: t.size.mapMarker,
    borderRadius: t.size.mapMarker / 2,
    backgroundColor: c.brand,
    borderWidth: 2.5,
    borderColor: c.knob,
    alignItems: 'center',
    justifyContent: 'center',
    ...t.shadow.floatingButton,
  },
  stem: {
    width: 3,
    height: 8,
    backgroundColor: c.brand,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  label: {
    marginTop: 6,
    maxWidth: 160,
    backgroundColor: c.surface,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    ...t.shadow.floatingButton,
  },
  ghost: {
    opacity: 0,
  },
  eta: {
    backgroundColor: c.brand,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
}));
