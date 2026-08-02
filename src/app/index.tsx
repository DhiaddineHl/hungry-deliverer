import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthBackdrop } from '@/components/auth/auth-backdrop';
import { GoogleButton, OrDivider, TermsFooter } from '@/components/auth/auth-common';
import { TextField } from '@/components/auth/text-field';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Text } from '@/components/ui/text';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth, wasCancelled } from '@/contexts/auth-context';
import { loginSchema, type LoginValues } from '@/features/auth/schemas';

// The landing → login reveal plays only the first time the app is opened.
// Kept at module scope so it survives remounts within a session.
let introPlayed = false;

const INTRO_DELAY = 650;
const INTRO_DURATION = 850;

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { login, loginWithGoogle } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // The artwork's resting position (translateY 0) is the final login state, with
  // the logo near the top. For the landing frame it starts pushed down — roughly
  // centred — then rises into place.
  const heroShift = height * 0.26;

  const shouldPlayIntro = !introPlayed;
  // 0 = landing (art centred, form off-screen), 1 = login (art up, form in view).
  const progress = useSharedValue(shouldPlayIntro ? 0 : 1);

  useEffect(() => {
    if (!shouldPlayIntro) return;
    introPlayed = true;
    progress.value = withDelay(INTRO_DELAY, withTiming(1, { duration: INTRO_DURATION }));
  }, [shouldPlayIntro, progress]);

  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [heroShift, 0]) }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [height, 0]) }],
    opacity: interpolate(progress.value, [0, 0.4, 1], [0, 0, 1]),
  }));

  const { control, handleSubmit } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginValues) => {
    setAuthError(null);
    setIsSubmitting(true);
    try {
      const result = await login(values.email.trim(), values.password);
      if (result.success) {
        router.replace('/delivery');
      } else {
        setAuthError(result.error ?? 'Login failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onGoogleLogin = async () => {
    setAuthError(null);
    setIsGoogleLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result.success) {
        router.replace('/delivery');
      } else if (!wasCancelled(result.error)) {
        // Dismissing the browser is a choice, not a failure worth a red banner.
        setAuthError(result.error ?? 'Google sign-in failed');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <AuthBackdrop heroStyle={heroStyle} />

      <Animated.View style={[styles.cardWrap, cardStyle]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <ScrollView
            contentContainerStyle={[
              styles.cardContent,
              { paddingBottom: insets.bottom + Spacing.five },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}>
            <View style={styles.heading}>
              <Text weight="bold" size={24}>
                Welcome !
              </Text>
              <Text size={15} color={Colors.textSecondary} style={styles.subtitle}>
                Hungry? We got you !
              </Text>
            </View>

            {authError ? (
              <View style={styles.errorBanner}>
                <Text size={14} color="#B3261E">
                  {authError}
                </Text>
              </View>
            ) : null}

            <TextField
              control={control}
              name="email"
              label="Email"
              placeholder="Email"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              containerStyle={styles.field}
            />

            <TextField
              control={control}
              name="password"
              label="Password"
              placeholder="Password"
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              containerStyle={styles.field}
            />

            <Pressable
              accessibilityRole="button"
              onPress={() => {}}
              hitSlop={8}
              style={styles.forgot}>
              <Text weight="semibold" size={14} color={Colors.teal}>
                Forgot Password
              </Text>
            </Pressable>

            <PrimaryButton
              label={isSubmitting ? 'LOGGING IN…' : 'LOG IN'}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting || isGoogleLoading}
              style={styles.submit}
            />

            <View style={styles.switchRow}>
              <Text size={14} color={Colors.textSecondary}>
                Don&apos;t have an account?{' '}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/register')}
                hitSlop={8}>
                <Text weight="bold" size={14} color={Colors.orange}>
                  SIGN UP
                </Text>
              </Pressable>
            </View>

            <OrDivider />
            <GoogleButton onPress={onGoogleLogin} disabled={isGoogleLoading || isSubmitting} />
            <TermsFooter />
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.navy,
  },
  flex: {
    flex: 1,
  },
  cardWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // A definite height (not maxHeight): an auto-height absolute card leaves the
    // ScrollView unbounded, so it sizes to its content and clips instead of
    // scrolling. The form is taller than the sheet on every phone anyway.
    height: '68%',
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    ...Shadow.card,
  },
  cardContent: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.six,
  },
  heading: {
    alignItems: 'center',
    marginBottom: Spacing.five,
  },
  subtitle: {
    marginTop: Spacing.one,
  },
  errorBanner: {
    padding: Spacing.three,
    marginBottom: Spacing.four,
    borderRadius: Radius.md,
    backgroundColor: '#FDECEA',
  },
  field: {
    marginBottom: Spacing.four,
  },
  forgot: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.five,
  },
  submit: {
    marginBottom: Spacing.four,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
});
