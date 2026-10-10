import { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { makeStyles, useTheme } from '@/theme';

type Props = {
  /** `onInk` inside a navy button; `ink` on light surfaces. */
  tone?: 'ink' | 'onInk';
  size?: number;
};

/**
 * The 18 pt ring: a 2.5 stroke track with one coloured quarter, turning every
 * 0.8 s. Static under Reduce Motion (the ring still reads as "busy").
 */
export function Spinner({ tone = 'ink', size = 18 }: Props) {
  const { colors, motion } = useTheme();
  const styles = useStyles();
  const reduceMotion = useReducedMotion();
  const turn = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    turn.set(withRepeat(
      withTiming(360, { duration: motion.spinnerMs, easing: Easing.linear }),
      -1,
      false
    ));
    return () => cancelAnimation(turn);
  }, [reduceMotion, turn, motion.spinnerMs]);

  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get()}deg` }] }));

  return (
    <Animated.View
      accessibilityRole="progressbar"
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: tone === 'onInk' ? colors.spinnerTrackOnInk : colors.spinnerTrack,
          borderTopColor: tone === 'onInk' ? colors.onInk : colors.ink,
        },
        spin,
      ]}
    />
  );
}

const useStyles = makeStyles(() => ({
  ring: {
    borderWidth: 2.5,
  },
}));
