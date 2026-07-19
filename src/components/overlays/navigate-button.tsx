import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';

/** Navy "Navigate" pill that starts in-app turn-by-turn guidance for the leg. */
export function NavigateButton({
  onPress,
  loading = false,
}: {
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Navigate"
      accessibilityState={{ disabled: loading }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <View style={styles.icon}>
        {loading ? (
          <ActivityIndicator size="small" color={Colors.navy} />
        ) : (
          <Ionicons name="navigate" size={14} color={Colors.navy} />
        )}
      </View>
      <Text weight="semibold" size={16} color={Colors.white}>
        {loading ? 'Starting…' : 'Navigate'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.navy,
    paddingLeft: Spacing.two,
    paddingRight: Spacing.five,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    ...Shadow.pill,
  },
  icon: {
    width: 30,
    height: 30,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
