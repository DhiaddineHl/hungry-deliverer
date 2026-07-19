import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { useTracksViewChanges } from '@/components/map/use-tracks-view-changes';
import { Text } from '@/components/ui/text';
import { Colors, Radius } from '@/constants/theme';
import type { DemandLevel, Hotspot } from '@/features/session/types';

const LABELS: Record<DemandLevel, string> = {
  busy: 'Busy',
  moderate: 'Moderate',
  quiet: 'Not busy',
};

/** The navy demand callouts scattered over the Home / Finding Orders frames. */
export const HotspotPill = memo(function HotspotPill({ hotspot }: { hotspot: Hotspot }) {
  const tracksViewChanges = useTracksViewChanges();

  return (
    <Marker
      coordinate={hotspot.coordinate}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={tracksViewChanges}
      // The pills are ambient information, not tap targets.
      tappable={false}>
      <View style={styles.container}>
        <View style={styles.bubble}>
          <Text weight="semibold" size={14} color={Colors.white}>
            {LABELS[hotspot.level]}
          </Text>
        </View>
        <View style={styles.tail} />
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  bubble: {
    backgroundColor: Colors.navy,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: Radius.sm,
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.navy,
  },
});
