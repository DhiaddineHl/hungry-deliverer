import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { SessionProvider } from '@/features/session/session-context';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { queryClient, wireAppFocus } from '@/services/api/query-client';

SplashScreen.preventAutoHideAsync();

/**
 * Routes reachable without a session. The identification screen — the single
 * door in, where the address alone decides whether the next step is the
 * password field or sign-up — is the index route, so its segment is undefined.
 * 'password' and 'register' are the two screens it leads to; 'auth' is the
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
  'auth',
  'verification',
  'forgot-password',
  'reset-code',
  'new-password',
];

/** The one-time-code screen, reachable with and without a session. */
const VERIFICATION_ROUTE = 'verification';

function RootNavigator() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading, user } = useAuth();
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
      router.replace('/delivery');
    }
  }, [isAuthenticated, isLoading, segments, router, user]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="password" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="register" options={{ animation: 'slide_from_right' }} />
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
      </Stack>
    </>
  );
}

export default function RootLayout() {
  // The expo-font config plugin already bundles Poppins into native builds, so
  // this resolves instantly there; it is what makes the fonts work in Expo Go.
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  // Forward app foreground/background state to React Query's focusManager so
  // stale queries refetch when the app comes back to the foreground.
  useEffect(() => wireAppFocus(), []);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
    </GestureHandlerRootView>
  );
}
