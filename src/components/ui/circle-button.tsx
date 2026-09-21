import { Ionicons } from '@expo/vector-icons';
import { Pressable, type ViewStyle } from 'react-native';

import { makeStyles } from '@/hooks/use-themed-styles';
import { useColors } from '@/contexts/theme-context';
import { Radius, Shadow } from '@/constants/theme';

type Props = {
  name: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  iconSize?: number;
  background?: string;
  color?: string;
  style?: ViewStyle;
};

/** The white circular map controls: menu, help, recenter, layers. */
export function CircleButton({
  name,
  onPress,
  accessibilityLabel,
  size = 52,
  iconSize = 24,
  background,
  color,
  style,
}: Props) {
  const colors = useColors();
  const styles = useStyles();
  // Themed defaults, so the control stays a light chip on a light map and a
  // dark one at night; an explicit prop still wins.
  const chip = background ?? colors.card;
  const icon = color ?? colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, backgroundColor: chip },
        pressed && styles.pressed,
        style,
      ]}>
      <Ionicons name={name} size={iconSize} color={icon} />
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  button: {
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.pill,
  },
  pressed: {
    opacity: 0.7,
  },
}));
