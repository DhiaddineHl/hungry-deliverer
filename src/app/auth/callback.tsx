import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { AuthLayout } from '@/components/auth/auth-layout';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/contexts/auth-context';
import { useLocale } from '@/contexts/locale-context';
import { makeStyles } from '@/theme';

/** How long to wait for the token exchange before going back. */
const GIVE_UP_MS = 4000;

/**
 * Landing route for the OAuth deep link `hungrydeliverer://auth/callback`.
 *
 * expo-auth-session consumes that URL itself, but expo-router also receives it
 * and navigates here; without this file the router shows its "Unmatched Route"
 * screen even when the sign-in succeeded. The screen owns no auth logic: the
 * root navigator routes a successful sign-in once `isAuthenticated` flips.
 */
export default function AuthCallbackScreen() {
  const { t } = useLocale();
  const styles = useStyles();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    // The exchange has not landed (or failed): return to login rather than spin forever.
    const timer = setTimeout(() => router.replace('/'), GIVE_UP_MS);
    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading, router]);

  return (
    <AuthLayout>
      <View style={styles.center} accessibilityLiveRegion="polite">
        <Spinner size={28} />
        <Text variant="itemLabel" color="inkMuted">
          {t('auth.signingIn')}
        </Text>
      </View>
    </AuthLayout>
  );
}

const useStyles = makeStyles(() => ({
  center: {
    alignItems: 'center',
    gap: 14,
    paddingTop: 24,
  },
}));
