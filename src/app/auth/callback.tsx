import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { ThemedStatusBar } from '@/components/ui/themed-status-bar';
import { makeStyles } from '@/hooks/use-themed-styles';
import { useColors } from '@/contexts/theme-context';
import { AuthBackdrop } from '@/components/auth/auth-backdrop';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';

/** One full turn of the ring. Slow enough to read as branding, not a hang. */
const SPIN_DURATION_MS = 1400;
/** How long to wait for the token exchange before giving up and going back. */
const GIVE_UP_MS = 4000;

/**
 * Landing route for the OAuth deep link `hungrydeliverer://auth/callback`.
 *
 * expo-auth-session consumes that URL itself (it races a Linking listener
 * against the Custom Tab), but expo-router *also* receives it and navigates
 * here. Without this file the router falls through to its built-in "Unmatched
 * Route" screen, which strands the deliverer even when the sign-in succeeded.
 *
 * The screen owns no auth logic and does not route a successful sign-in: the
 * root navigator does that once `isAuthenticated` flips.
 */
export default function AuthCallbackScreen() {
  const colors = useColors();
  const styles = useStyles();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const spin = useSharedValue(0);

  // 0deg and 360deg are the same frame, so repeating without reversing gives a
  // seamless loop. Runs on the UI thread, so the token exchange resolving on
  // the JS thread never stutters it.
  useEffect(() => {
    spin.value = withRepeat(
      withTiming(360, { duration: SPIN_DURATION_MS, easing: Easing.linear }),
      -1,
      false
    );
  }, [spin]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  useEffect(() => {
    // Signed in: the root navigator takes it from here.
    if (isLoading || isAuthenticated) return;

    // The browser handed the code back but the exchange has not landed (or it
    // failed). Give it a beat, then return to login rather than spin forever.
    const timer = setTimeout(() => router.replace('/'), GIVE_UP_MS);
    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading, router]);

  return (
    <View style={styles.screen}>
      <ThemedStatusBar surface="navy" />
      <AuthBackdrop />

      <View style={styles.center}>
        <Animated.View style={[styles.ring, spinStyle]} />
        <Text weight="semibold" size={15} color={colors.onNavy} style={styles.label}>
          Signing you in…
        </Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: {
    flex: 1,
    backgroundColor: c.navy,
  },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    borderWidth: 3,
    // Three sides in the brand orange and one transparent reads as a spinner
    // once it rotates — no image, and it inherits the theme.
    borderColor: c.orange,
    borderTopColor: 'transparent',
  },
  label: {
    marginTop: Spacing.four,
  },
}));
