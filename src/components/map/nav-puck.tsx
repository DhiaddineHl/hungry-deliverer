import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { View } from 'react-native';
import { Marker } from 'react-native-maps';

import { makeStyles } from '@/hooks/use-themed-styles';
import { useColors } from '@/contexts/theme-context';
import { useTracksViewChanges } from '@/components/map/use-tracks-view-changes';
import type { LatLng } from '@/features/session/types';

/**
 * Chevron puck that points where the courier is heading during navigation.
 * `rotation` is a native Marker prop, so heading updates never re-rasterise the
 * custom view — that stops painting once `tracksViewChanges` settles.
 */
export const NavPuck = memo(function NavPuck({
  coordinate,
  heading,
}: {
  coordinate: LatLng;
  heading: number;
}) {
  const colors = useColors();
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
      <View style={styles.disc}>
        <Ionicons name="caret-up" size={22} color={colors.onNavy} style={styles.arrow} />
      </View>
    </Marker>
  );
});

const useStyles = makeStyles((c) => ({
  disc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.etaBadge,
    borderWidth: 3,
    borderColor: c.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    // Nudge the caret up so it reads as a direction of travel, not a centred dot.
    marginTop: -2,
  },
}));
