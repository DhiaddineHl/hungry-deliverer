import { useEffect } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { Icon, makeStyles, type IconName } from '@/theme';

/** 22 pt box, radius 6. Off: 1.5 outline. On: navy fill with a white check. */
export function Checkbox({ checked }: { checked: boolean }) {
  const styles = useStyles();
  return (
    <View style={[styles.checkbox, checked && styles.checkboxOn]}>
      {checked ? <Icon name="check" size="inline" color="onInk" /> : null}
    </View>
  );
}

/** 44×26 pill. On: navy track, knob slides right. Off: outline track. */
export function Toggle({
  value,
  onValueChange,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  accessibilityLabel: string;
}) {
  const styles = useStyles();
  const offset = useSharedValue(value ? 18 : 0);

  useEffect(() => {
    offset.set(withTiming(value ? 18 : 0, { duration: 160 }));
  }, [value, offset]);

  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      hitSlop={10}
      style={[styles.toggle, value && styles.toggleOn]}>
      <Animated.View style={[styles.knob, knob]} />
    </Pressable>
  );
}

/** 40 pt pill. Default: outline. Selected: navy with white text. */
export function FilterChip({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon?: IconName;
  selected: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipOn, pressed && styles.pressed]}>
      {icon ? <Icon name={icon} size="small" color={selected ? 'onInk' : 'ink'} /> : null}
      <Text variant="chip" color={selected ? 'onInk' : 'ink'}>
        {label}
      </Text>
    </Pressable>
  );
}

type Segment<K extends string> = { key: K; label: string };

/**
 * Segmented control. `regular` is 44 pt (History period); `small` is the 32 pt
 * one that sits inside a list row (Language).
 */
export function SegmentedControl<K extends string>({
  segments,
  value,
  onChange,
  size = 'regular',
  style,
}: {
  segments: Segment<K>[];
  value: K;
  onChange: (key: K) => void;
  size?: 'regular' | 'small';
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  const small = size === 'small';
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.track, small ? styles.trackSmall : styles.trackRegular, style]}>
      {segments.map((segment) => {
        const selected = segment.key === value;
        return (
          <Pressable
            key={segment.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(segment.key)}
            style={[
              small ? styles.segmentSmall : styles.segment,
              selected && styles.segmentOn,
            ]}>
            <Text
              variant={small ? 'caption' : 'chip'}
              color={selected ? 'ink' : 'inkMuted'}
              style={small ? styles.smallLabel : null}
              numberOfLines={1}>
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((c, t) => ({
  checkbox: {
    width: t.size.checkbox,
    height: t.size.checkbox,
    borderRadius: t.radius.badge,
    borderWidth: 1.5,
    borderColor: c.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: c.ink,
    borderColor: c.ink,
  },
  toggle: {
    width: t.size.toggle.w,
    height: t.size.toggle.h,
    borderRadius: t.radius.pill,
    backgroundColor: c.outline,
    padding: 2,
  },
  toggleOn: {
    backgroundColor: c.ink,
  },
  knob: {
    width: t.size.toggle.knob,
    height: t.size.toggle.knob,
    borderRadius: t.size.toggle.knob / 2,
    backgroundColor: c.knob,
  },
  chip: {
    height: t.size.chip,
    borderRadius: t.radius.pill,
    borderWidth: 1.5,
    borderColor: c.outline,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipOn: {
    backgroundColor: c.ink,
    borderColor: c.ink,
  },
  pressed: {
    opacity: t.opacity.pressed,
  },
  track: {
    flexDirection: 'row',
    backgroundColor: c.surfaceSunken,
  },
  trackRegular: {
    height: t.size.segment,
    borderRadius: t.radius.control,
    padding: 4,
    gap: 4,
  },
  trackSmall: {
    height: t.size.segmentSmall,
    borderRadius: t.radius.segmentInner,
    padding: 3,
    gap: 2,
  },
  segment: {
    flex: 1,
    borderRadius: t.radius.segmentInner,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSmall: {
    borderRadius: 7,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOn: {
    backgroundColor: c.surface,
    ...t.shadow.segmentSelected,
  },
  smallLabel: {
    fontFamily: t.typography.chip.fontFamily,
  },
}));
