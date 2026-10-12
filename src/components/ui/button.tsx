import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { Icon, makeStyles, type IconName } from '@/theme';

type PrimaryProps = {
  label: string;
  onPress: () => void;
  /** Disabled buttons may carry the reason as their label ("Confirm pickup · 2 of 3 checked"). */
  disabled?: boolean;
  /** Spinner + progressive label ("Logging in…"); not pressable while set. */
  loading?: boolean;
  icon?: IconName;
  /** An amount on the right, the label then sits left (buttons that charge money). */
  right?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** Height 52, radius 14, navy. The one way to say "do this" (navy acts). */
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  icon,
  right,
  accessibilityLabel,
  style,
}: PrimaryProps) {
  const styles = useStyles();
  const inactive = disabled || loading;
  const textColor = disabled && !loading ? 'inkMuted' : 'onInk';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primary,
        right ? styles.spread : null,
        disabled && !loading && styles.primaryDisabled,
        pressed && styles.pressed,
        style,
      ]}>
      <View style={styles.content}>
        {loading ? <Spinner tone="onInk" /> : icon ? <Icon name={icon} color={textColor} /> : null}
        <Text variant="button" color={textColor} numberOfLines={1}>
          {label}
        </Text>
      </View>
      {right ? (
        <Text variant="button" color={textColor} tabular>
          {right}
        </Text>
      ) : null}
    </Pressable>
  );
}

type SecondaryProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** Height 52, radius 14, 1.5 outline. The quieter alternative next to a primary. */
export function SecondaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  icon,
  accessibilityLabel,
  style,
}: SecondaryProps) {
  const styles = useStyles();
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondary,
        inactive && styles.secondaryDisabled,
        pressed && styles.pressed,
        style,
      ]}>
      {loading ? <Spinner /> : icon ? <Icon name={icon} /> : null}
      <Text variant="buttonSecondary" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Underlined 14/600 navy text — inline actions ("History", "Change", "Go offline"). */
export function TextLink({
  label,
  onPress,
  disabled,
  accessibilityLabel,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [pressed && styles.pressed, disabled && styles.linkDisabled, style]}>
      <Text variant="link" style={styles.link}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((c, t) => ({
  primary: {
    height: t.size.button,
    borderRadius: t.radius.field,
    backgroundColor: c.ink,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spread: {
    justifyContent: 'space-between',
  },
  primaryDisabled: {
    backgroundColor: c.surfaceSunken,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  secondary: {
    height: t.size.button,
    borderRadius: t.radius.field,
    borderWidth: 1.5,
    borderColor: c.outline,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  secondaryDisabled: {
    opacity: t.opacity.lockedInput,
  },
  link: {
    textDecorationColor: c.ink,
  },
  linkDisabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: t.opacity.pressed,
    transform: [{ scale: t.motion.pressScale }],
  },
}));
