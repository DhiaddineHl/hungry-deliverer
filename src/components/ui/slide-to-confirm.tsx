import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { Icon, makeStyles, useTheme } from '@/theme';

type Props = {
  label: string;
  /** Replaces the label while `confirming`. */
  confirmingLabel: string;
  onConfirm: () => void;
  /** Outside the confirm radius: muted track, gestures ignored, helper shown. */
  locked: boolean;
  /** Shown under a locked slider ("Available within 200 m of the drop-off"). */
  lockedHelper?: string;
  /** The confirm is in flight: handle parked at the end, spinner in the label. */
  confirming?: boolean;
};

function notifySuccess() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/**
 * The one gesture-confirmed action in the app (Confirm delivery). Drag the
 * handle past 85 % of the track: it snaps home, a success haptic fires and
 * `onConfirm` runs. Short of that it springs back. Screen-reader users get it
 * as a plain button with an `activate` action.
 */
export function SlideToConfirm({
  label,
  confirmingLabel,
  onConfirm,
  locked,
  lockedHelper,
  confirming = false,
}: Props) {
  const { size, motion } = useTheme();
  const styles = useStyles();
  const [trackWidth, setTrackWidth] = useState(0);
  const { h, handle, inset } = size.slideToConfirm;
  const maxTravel = Math.max(trackWidth - handle - inset * 2, 1);
  const offset = useSharedValue(0);

  // Parked at the end while confirming; back to the start if it fails.
  useEffect(() => {
    offset.set(confirming ? withTiming(maxTravel, { duration: 120 }) : withSpring(0, { damping: 18, stiffness: 220 }));
  }, [confirming, maxTravel, offset]);

  const commit = () => {
    notifySuccess();
    onConfirm();
  };

  const pan = Gesture.Pan()
    .enabled(!locked && !confirming && trackWidth > 0)
    .onChange((event) => {
      offset.set(Math.min(Math.max(offset.get() + event.changeX, 0), maxTravel));
    })
    .onEnd(() => {
      if (offset.get() >= maxTravel * motion.slideThreshold) {
        offset.set(withTiming(maxTravel, { duration: 120 }));
        runOnJS(commit)();
      } else {
        offset.set(withSpring(0, { damping: 18, stiffness: 220 }));
      }
    });

  const handleStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));
  // The label fades as the handle passes over it, so the two never overlap.
  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offset.get(), [0, maxTravel * 0.5], [1, 0.15], 'clamp'),
  }));

  const onLayout = (event: LayoutChangeEvent) => setTrackWidth(event.nativeEvent.layout.width);

  return (
    <View style={styles.container}>
      <View
        onLayout={onLayout}
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={locked ? lockedHelper : undefined}
        accessibilityState={{ disabled: locked, busy: confirming }}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'activate' && !locked && !confirming) commit();
        }}
        style={[styles.track, { height: h }, locked ? styles.trackLocked : styles.trackReady]}>
        <Animated.View style={[styles.labelRow, labelStyle]} pointerEvents="none">
          {confirming ? <Spinner tone="onInk" /> : null}
          <Text variant="button" color={locked ? 'inkMuted' : 'onInk'} numberOfLines={1}>
            {confirming ? confirmingLabel : label}
          </Text>
        </Animated.View>

        <GestureDetector gesture={pan}>
          <Animated.View
            style={[
              styles.handle,
              { width: handle, height: handle, top: inset, left: inset },
              locked && styles.handleLocked,
              handleStyle,
            ]}>
            <Icon name="slide" size="nav" color={locked ? 'inkMuted' : 'ink'} />
          </Animated.View>
        </GestureDetector>
      </View>

      {locked && lockedHelper ? (
        <Text variant="caption" color="inkMuted" align="center" style={styles.helper}>
          {lockedHelper}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c, t) => ({
  container: {
    gap: 6,
  },
  track: {
    borderRadius: t.radius.thumb,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  trackReady: {
    backgroundColor: c.ink,
  },
  trackLocked: {
    backgroundColor: c.surfaceSunken,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingLeft: 40,
    paddingRight: 12,
  },
  handle: {
    position: 'absolute',
    borderRadius: t.radius.control,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleLocked: {
    borderWidth: 1.5,
    borderColor: c.outline,
  },
  helper: {
    fontFamily: t.typography.description.fontFamily,
  },
}));
