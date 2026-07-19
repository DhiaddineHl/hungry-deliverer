import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
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

  const onSubmit = (_values: LoginValues) => {
    // Authentication is stubbed for now — go straight to the delivery app.
    router.replace('/delivery');
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
              label="LOG IN"
              onPress={handleSubmit(onSubmit)}
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
            <GoogleButton onPress={() => {}} />
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
    maxHeight: '68%',
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
