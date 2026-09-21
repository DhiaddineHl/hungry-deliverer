import { memo } from 'react';
import { View } from 'react-native';
import { Marker } from 'react-native-maps';

import { makeStyles } from '@/hooks/use-themed-styles';
import { useColors } from '@/contexts/theme-context';
import { useTracksViewChanges } from '@/components/map/use-tracks-view-changes';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import type { LatLng } from '@/features/session/types';

type Props = {
  coordinate: LatLng;
  minutes: number;
};

/** The blue "3 min" bubble sitting on the route. */
export const EtaBadge = memo(function EtaBadge({ coordinate, minutes }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const tracksViewChanges = useTracksViewChanges();

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracksViewChanges}
      tappable={false}
      zIndex={3}>
      <View style={styles.badge}>
        <Text weight="bold" size={14} color={colors.onNavy}>
          {minutes} min
        </Text>
      </View>
    </Marker>
  );
});

const useStyles = makeStyles((c) => ({
  badge: {
    backgroundColor: c.etaBadge,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: c.white,
  },
}));
