import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, makeStyles, type IconName } from '@/theme';

type Variant =
  /** 1.5 outline circle — top bars on inner pages. */
  | 'outlined'
  /** White circle with the floating shadow — map chrome (menu, help, locate). */
  | 'floating'
  /** White circle, no shadow — over the navy auth header. */
  | 'plain'
  /** Navy circle with a white icon — call buttons. */
  | 'filled';

type Props = {
  name: IconName;
  onPress: () => void;
  /** Every icon-only button names what it does. */
  accessibilityLabel: string;
  variant?: Variant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** 44 pt circle around a single icon. */
export function IconButton({
  name,
  onPress,
  accessibilityLabel,
  variant = 'outlined',
  disabled,
  style,
}: Props) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed, style]}>
      <Icon
        name={name}
        size={name === 'back' ? 'nav' : name === 'phone' ? 'row' : 'field'}
        color={variant === 'filled' ? 'onInk' : 'ink'}
      />
    </Pressable>
  );
}

const useStyles = makeStyles((c, t) => ({
  base: {
    width: t.size.iconButton,
    height: t.size.iconButton,
    borderRadius: t.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlined: {
    borderWidth: 1.5,
    borderColor: c.outlineSubtle,
  },
  floating: {
    backgroundColor: c.surface,
    ...t.shadow.floatingButton,
  },
  plain: {
    backgroundColor: c.surface,
  },
  filled: {
    backgroundColor: c.ink,
  },
  pressed: {
    opacity: t.opacity.pressed,
    transform: [{ scale: t.motion.pressScale }],
  },
}));
