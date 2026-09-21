import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useLocale } from '@/contexts/locale-context';
import { makeStyles } from '@/hooks/use-themed-styles';
import { useColors } from '@/contexts/theme-context';
import { Text } from '@/components/ui/text';
import { Fonts, Radius, Shadow } from '@/constants/theme';

const TRACK_HEIGHT = 56;
const KNOB_SIZE = 48;
const PADDING = 4;
/** Fraction of the track the knob must cross to fire. */
const COMMIT_THRESHOLD = 0.75;

type Props = {
  label: string;
  onConfirm: () => void;
  /** Renders the fulfilled state from the "Delivery complete" frame. */
  confirmed?: boolean;
  trackWidth: number;
};

function notifySuccess() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export function SlideToConfirm({ label, onConfirm, confirmed = false, trackWidth }: Props) {
  const { t } = useLocale();
  const colors = useColors();
  const styles = useStyles();
  const maxTravel = Math.max(trackWidth - KNOB_SIZE - PADDING * 2, 1);
  const offset: SharedValue<number> = useSharedValue(0);

  useEffect(() => {
    offset.value = withTiming(confirmed ? maxTravel : 0, { duration: 260 });
  }, [confirmed, maxTravel, offset]);

  const pan = Gesture.Pan()
    .enabled(!confirmed)
    .onChange((event) => {
      offset.value = Math.min(Math.max(offset.value + event.changeX, 0), maxTravel);
    })
    .onEnd(() => {
      if (offset.value >= maxTravel * COMMIT_THRESHOLD) {
        offset.value = withTiming(maxTravel, { duration: 120 });
        runOnJS(notifySuccess)();
        runOnJS(onConfirm)();
      } else {
        offset.value = withSpring(0, { damping: 18, stiffness: 220 });
      }
    });

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offset.value, [0, maxTravel], [0, 1]),
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      offset.value,
      [0, maxTravel * 0.6],
      [colors.textMuted, colors.onNavy],
    ),
  }));

  return (
    <View style={[styles.track, { width: trackWidth }]}>
      <Animated.View style={[styles.fill, fillStyle]} pointerEvents="none" />

      <Animated.Text
        style={[styles.label, labelStyle]}
        accessibilityRole="text"
        pointerEvents="none">
        {label}
      </Animated.Text>

      <GestureDetector gesture={pan}>
        <Animated.View
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityHint={t('delivery.slideToConfirm')}
          style={[styles.knob, knobStyle]}>
          <Ionicons name="arrow-forward" size={22} color={colors.onNavy} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  track: {
    height: TRACK_HEIGHT,
    borderRadius: Radius.pill,
    backgroundColor: c.field,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: c.orange,
  },
  label: {
    textAlign: 'center',
    fontFamily: Fonts.semibold,
    fontSize: 17,
  },
  knob: {
    position: 'absolute',
    left: PADDING,
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: Radius.pill,
    backgroundColor: c.orange,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.pill,
  },
}));
