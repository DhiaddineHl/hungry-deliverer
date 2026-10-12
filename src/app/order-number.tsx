import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { ThemedStatusBar } from '@/components/ui/themed-status-bar';
import { useLocale } from '@/contexts/locale-context';
import { useSession } from '@/features/session/session-context';
import { makeStyles } from '@/theme';

import Logo from '../../assets/brand/logo-hungry.svg';

/**
 * The pickup code, turned sideways so the rider can hold the phone up and the
 * clerk across the counter reads it the right way round. Brand navy, the one
 * full-bleed navy surface besides the auth header.
 */
export default function OrderNumberScreen() {
  const { t } = useLocale();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { order } = useSession();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <ThemedStatusBar surface="brand" />
      <View style={styles.header}>
        <Logo width={88} height={29} accessibilityLabel="Hungry" />
        <IconButton
          name="close"
          variant="plain"
          accessibilityLabel={t('common.close')}
          onPress={() => router.back()}
        />
      </View>

      <View style={styles.center}>
        <View style={styles.rotated}>
          <Text variant="pickupCode" color="onBrand" numberOfLines={1} adjustsFontSizeToFit>
            #{order?.reference ?? '----'}
          </Text>
          <Text variant="bodySmall" color="onBrand" align="center" style={styles.hint}>
            {t('delivery.pickupCodeHint')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c, t) => ({
  screen: {
    flex: 1,
    backgroundColor: c.brand,
  },
  header: {
    paddingHorizontal: t.chromePadding,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotated: {
    transform: [{ rotate: '90deg' }],
    alignItems: 'center',
    width: 600,
  },
  hint: {
    opacity: 0.8,
  },
}));
