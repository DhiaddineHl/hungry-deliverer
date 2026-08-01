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
import { queryClient, wireAppFocus } from '@/services/api/query-client';

SplashScreen.preventAutoHideAsync();

/** The login screen is the index route, so its segment is undefined. */
const AUTH_ROUTES = [undefined, 'register'];

function RootNavigator() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return; // wait for the stored session to be restored

    const inAuthGroup = AUTH_ROUTES.includes(segments[0]);

    if (isAuthenticated && inAuthGroup) {
      router.replace('/delivery');
    } else if (!isAuthenticated && !inAuthGroup) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="register" options={{ animation: 'slide_from_right' }} />
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
