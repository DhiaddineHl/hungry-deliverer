import { memo } from 'react';
import { View } from 'react-native';
import { Marker } from 'react-native-maps';

import { useTracksViewChanges } from '@/components/map/use-tracks-view-changes';
import type { LatLng } from '@/features/session/types';
import { Icon, makeStyles } from '@/theme';

/**
 * The rider during turn-by-turn: a navy disc with a white arrow pointing the
 * way of travel. `rotation` is a native Marker prop, so heading updates never
 * re-rasterise the view.
 */
export const NavPuck = memo(function NavPuck({ coordinate, heading }: { coordinate: LatLng; heading: number }) {
  const styles = useStyles();
  const tracksViewChanges = useTracksViewChanges();
  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      flat
      rotation={heading}
      tracksViewChanges={tracksViewChanges}
      tappable={false}
      zIndex={6}>
      <View style={styles.halo}>
        <View style={styles.disc}>
          <Icon name="straight" size="field" color="onBrand" />
        </View>
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
  disc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.brand,
    borderWidth: 3,
    borderColor: c.knob,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
