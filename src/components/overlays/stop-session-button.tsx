import { Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';

/** Ends the shift — sits just under the "Finding orders" pill. */
export function StopSessionButton({ onPress }: { onPress: () => void }) {
  return (
    <Animated.View entering={FadeInUp.duration(220)} exiting={FadeOutUp.duration(160)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Stop session"
        onPress={onPress}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Text weight="semibold" size={16} color="#D64545">
          Stop Session
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.five,
    height: 44,
    justifyContent: 'center',
    borderRadius: Radius.pill,
    ...Shadow.pill,
  },
  pressed: {
    opacity: 0.8,
  },
});
