import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLocale } from '@/contexts/locale-context';
import { ThemedStatusBar } from '@/components/ui/themed-status-bar';
import { makeStyles } from '@/hooks/use-themed-styles';
import { useColors } from '@/contexts/theme-context';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/session/session-context';

/**
 * The pickup code, turned sideways so the courier can hold the phone up and the
 * clerk across the counter reads it the right way round.
 */
export default function OrderNumberScreen() {
  const { t } = useLocale();
  const colors = useColors();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { order } = useSession();

  return (
    <View style={styles.screen}>
      <ThemedStatusBar surface="navy" />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.four }]}>
        <Text weight="bold" size={16} color={colors.onNavy}>
          hungry<Text weight="bold" size={16} color={colors.orange}>.</Text>
        </Text>
      </View>

      <View style={styles.center}>
        <Text weight="bold" size={110} color={colors.onNavy} style={styles.reference}>
          #{order?.reference ?? '----'}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('delivery.close')}
        onPress={() => router.back()}
        hitSlop={16}
        style={[styles.close, { paddingBottom: insets.bottom + Spacing.four }]}>
        <Ionicons name="close" size={28} color={colors.onNavy} />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: {
    flex: 1,
    backgroundColor: c.navy,
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
}));
