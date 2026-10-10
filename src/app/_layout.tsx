// Per-weight entry points: the package root would pull all 18 Poppins files
// (italics, thin…) into the bundle; the app uses these five.
import { Poppins_400Regular } from '@expo-google-fonts/poppins/400Regular';
import { Poppins_500Medium } from '@expo-google-fonts/poppins/500Medium';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';
import { Poppins_700Bold } from '@expo-google-fonts/poppins/700Bold';
import { Poppins_800ExtraBold } from '@expo-google-fonts/poppins/800ExtraBold';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemedStatusBar } from '@/components/ui/themed-status-bar';
import { ToastHost } from '@/components/ui/toast';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { LocaleProvider } from '@/contexts/locale-context';
import { SessionProvider } from '@/features/session/session-context';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { queryClient, wireAppFocus } from '@/services/api/query-client';
import { wireAppStateToConnection } from '@/services/realtime/stomp-client';
import { usePasswordResetStore } from '@/store/password-reset-store';
import { ThemeProvider, useColors } from '@/theme';

SplashScreen.preventAutoHideAsync();

/**
 * Routes reachable without a session. The identification screen — the single
 * door in, where the address alone decides whether the next step is the
 * password field or the deliverer application — is the index route, so its
 * segment is undefined. 'password', 'register' (the application form) and
 * 'application-status' (an application under review) are the screens it leads
 * to; 'auth' is the
 * OAuth deep-link landing group (app/auth/callback.tsx), which must not be
 * bounced back to login while the token exchange is still in flight.
 * 'verification' is reached straight from sign-up, before the account has a
 * session at all — registration no longer logs anyone in. The three
 * forgotten-password screens are in the same position: someone who cannot log
 * in has no session by definition.
 */
const AUTH_ROUTES = [
  undefined,
  'password',
  'register',
  'application-status',
  'auth',
  'verification',
  'forgot-password',
  'reset-code',
  'new-password',
];

/** The one-time-code screen, reachable with and without a session. */
const VERIFICATION_ROUTE = 'verification';

/**
 * The three screens of a password reset. They are in AUTH_ROUTES because the
 * usual way in is "I cannot log in" — but Settings reuses them for a signed-in
 * deliverer changing their password on purpose, and the backend has no other
 * way to set a password (`/drivers/password-reset/*` is the only writer). When
 * that is what is happening, a session on these screens is expected rather than
 * something to bounce out of.
 */
const PASSWORD_RESET_ROUTES = ['forgot-password', 'reset-code', 'new-password'];

function RootNavigator() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading, user } = useAuth();
  const resetOrigin = usePasswordResetStore((state) => state.origin);
  const colors = useColors();
  usePushNotifications();

  useEffect(() => {
    if (isLoading) return; // wait for the stored session

    const inAuthGroup = AUTH_ROUTES.includes(segments[0]);
    const onVerification = segments[0] === VERIFICATION_ROUTE;

    if (!isAuthenticated) {
      if (!inAuthGroup) router.replace('/');
    } else if (user?.email_verified === false) {
      // An unverified address outranks every rule below: the account exists but
      // has not proved it owns the e-mail, so it goes back to the code screen
      // whichever way it got a session. Keycloak is the source of truth here
      // (`email_verified` is a claim on the token), and a claim the realm does
      // not emit reads as undefined, which deliberately gates nobody.
      if (!onVerification) router.replace('/verification');
    } else if (inAuthGroup) {
      // …unless the session is deliberately in the reset screens to change its
      // own password, which is the one authenticated journey through them.
      const changingOwnPassword =
        resetOrigin === 'settings' && PASSWORD_RESET_ROUTES.includes(segments[0] ?? '');
      if (!changingOwnPassword) router.replace('/delivery');
    }
  }, [isAuthenticated, isLoading, segments, router, user, resetOrigin]);

  return (
    <>
      <ThemedStatusBar />
      {/* contentStyle paints the gap a screen transition briefly exposes; left
          to its default it is white, which flashes on every push in dark mode. */}
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="password" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="register" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="application-status" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="verification" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="forgot-password" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="reset-code" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="new-password" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="auth/callback" options={{ animation: 'fade' }} />
        <Stack.Screen name="delivery" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="order-number"
          options={{ presentation: 'fullScreenModal', animation: 'fade' }}
        />
        <Stack.Screen
          name="menu"
          options={{ presentation: 'transparentModal', animation: 'fade' }}
        />
        {/* The drawer's destinations: ordinary pushed screens, so the back
            button on each one returns to the map with the drawer closed. */}
        <Stack.Screen name="wallet" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="delivery-history" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="faqs" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="edit-profile" options={{ animation: 'slide_from_right' }} />
      </Stack>
      <ToastHost />
    </>
  );
}

export default function RootLayout() {
  // The expo-font config plugin already bundles Poppins into native builds,
  // so this resolves instantly there; it is what makes the fonts work in Expo
  // Go. The keys are the family names `theme/typography.ts` selects by.
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  // Forward app foreground/background state to React Query's focusManager so
  // stale queries refetch when the app comes back to the foreground.
  useEffect(() => wireAppFocus(), []);

  // Close the STOMP connection while backgrounded, so the backend stops
  // counting this driver as reachable live and sends a push instead — see
  // `wireAppStateToConnection`.
  useEffect(() => wireAppStateToConnection(), []);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <LocaleProvider>
          <SafeAreaProvider>
            {/* AuthProvider uses useQueryClient, so it nests inside the provider. */}
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <SessionProvider>
                  <RootNavigator />
                </SessionProvider>
              </AuthProvider>
            </QueryClientProvider>
          </SafeAreaProvider>
        </LocaleProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
