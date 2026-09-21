import { useEffect } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { makeStyles } from '@/hooks/use-themed-styles';
import { useColors } from '@/contexts/theme-context';
import { Text } from '@/components/ui/text';
import { Radius, Shadow } from '@/constants/theme';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /**
   * When set, a darker band sweeps across the button over this duration —
   * the auto-decline countdown on the "Accept and Go" CTA.
   */
  countdownMs?: number;
  style?: ViewStyle;
};

export function PrimaryButton({ label, onPress, disabled, countdownMs, style }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!countdownMs) return;
    progress.value = 0;
    progress.value = withTiming(1, { duration: countdownMs, easing: Easing.linear });
  }, [countdownMs, progress]);

  // scaleX + transformOrigin keeps the sweep on the UI thread (no layout work).
  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      <View style={styles.fillClip} pointerEvents="none">
        {countdownMs ? <Animated.View style={[styles.fill, fillStyle]} /> : null}
      </View>
      <Text weight="semibold" size={17} color={colors.onNavy}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  button: {
    height: 56,
    borderRadius: Radius.pill,
    backgroundColor: c.orange,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Shadow.pill,
  },
  fillClip: {
    ...StyleSheet.absoluteFill,
  },
  fill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: c.orangeDeep,
    transformOrigin: 'right',
  },
  disabled: {
    backgroundColor: c.orangeMuted,
  },
  pressed: {
    opacity: 0.85,
  },
}));
