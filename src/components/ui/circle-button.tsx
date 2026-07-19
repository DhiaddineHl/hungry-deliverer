import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { Colors, Radius, Shadow } from '@/constants/theme';

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
  background = Colors.white,
  color = Colors.text,
  style,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, backgroundColor: background },
        pressed && styles.pressed,
        style,
      ]}>
      <Ionicons name={name} size={iconSize} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.pill,
  },
  pressed: {
    opacity: 0.7,
  },
});
