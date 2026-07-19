import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';

/** Teal nudge above the busy-place carousel on the Finding Orders frame. */
export function BusyAreaBanner() {
  return (
    <View style={styles.banner}>
      <Text weight="medium" size={15} color={Colors.white}>
        Go to a busy area for better chances
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignSelf: 'center',
    backgroundColor: Colors.teal,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Radius.pill,
    ...Shadow.pill,
  },
});
