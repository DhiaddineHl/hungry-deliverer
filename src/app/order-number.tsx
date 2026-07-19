import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';
import { useSession } from '@/features/session/session-context';

/**
 * The pickup code, turned sideways so the courier can hold the phone up and the
 * clerk across the counter reads it the right way round.
 */
export default function OrderNumberScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { order } = useSession();

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.four }]}>
        <Text weight="bold" size={16} color={Colors.white}>
          hungry<Text weight="bold" size={16} color={Colors.orange}>.</Text>
        </Text>
      </View>

      <View style={styles.center}>
        <Text weight="bold" size={110} color={Colors.white} style={styles.reference}>
          #{order?.reference ?? '----'}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={() => router.back()}
        hitSlop={16}
        style={[styles.close, { paddingBottom: insets.bottom + Spacing.four }]}>
        <Ionicons name="close" size={28} color={Colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.navy,
  },
  header: {
    paddingHorizontal: Spacing.five,
    alignItems: 'flex-end',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reference: {
    transform: [{ rotate: '90deg' }],
  },
  close: {
    alignSelf: 'flex-end',
    paddingHorizontal: Spacing.five,
  },
});
