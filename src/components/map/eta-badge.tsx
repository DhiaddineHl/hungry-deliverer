import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { useTracksViewChanges } from '@/components/map/use-tracks-view-changes';
import { Text } from '@/components/ui/text';
import { Colors, Radius } from '@/constants/theme';
import type { LatLng } from '@/features/session/types';

type Props = {
  coordinate: LatLng;
  minutes: number;
};

/** The blue "3 min" bubble sitting on the route. */
export const EtaBadge = memo(function EtaBadge({ coordinate, minutes }: Props) {
  const tracksViewChanges = useTracksViewChanges();

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracksViewChanges}
      tappable={false}
      zIndex={3}>
      <View style={styles.badge}>
        <Text weight="bold" size={14} color={Colors.white}>
          {minutes} min
        </Text>
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  badge: {
    backgroundColor: Colors.etaBadge,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: Colors.white,
  },
});
