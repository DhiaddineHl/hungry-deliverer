import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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

import { useLocale } from '@/contexts/locale-context';
import { ThemedStatusBar } from '@/components/ui/themed-status-bar';
import { makeStyles } from '@/hooks/use-themed-styles';
import { useColors } from '@/contexts/theme-context';
import { AuthBackdrop } from '@/components/auth/auth-backdrop';
import { GoogleButton, OrDivider, TermsFooter } from '@/components/auth/auth-common';
import { TextField } from '@/components/auth/text-field';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Text } from '@/components/ui/text';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth, wasCancelled } from '@/contexts/auth-context';
import { identificationSchema, type IdentificationValues } from '@/features/auth/schemas';
import { lookupAccount } from '@/services/api/driver-service';

// The landing → login reveal plays only the first time the app is opened.
// Kept at module scope so it survives remounts within a session.
let introPlayed = false;

const INTRO_DELAY = 650;
const INTRO_DURATION = 850;

/**
 * Identification — the single door into the app.
 *
 * There is no "log in or sign up?" choice to make any more: the deliverer types
 * an address, the backend says whether an account already stands behind it, and
 * that answer picks the next screen (the password field, or the sign-up form
 * with the address already settled). Which is why the cross-links to the other
 * auth screen are gone from here and from the screens it leads to — every one
 * of them is reachable only through this one.
 */
export default function IdentificationScreen() {
  const { t } = useLocale();
  const colors = useColors();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { loginWithGoogle } = useAuth();
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

  const { control, handleSubmit } = useForm<IdentificationValues>({
    resolver: zodResolver(identificationSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: IdentificationValues) => {
    setAuthError(null);
    setIsSubmitting(true);
    try {
      const email = values.email.trim().toLowerCase();
      const lookup = await lookupAccount(email);
      // The address travels as a route param rather than in a store: it is not
      // a secret (unlike the password, which never leaves memory), and a param
      // survives the screen being remounted by a reload.
      router.push({
        pathname: lookup.registered ? '/password' : '/register',
        params: { email },
      });
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : t('auth.errorServerUnreachable')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const onGoogleLogin = async () => {
    setAuthError(null);
    setIsGoogleLoading(true);
    try {
      const result = await loginWithGoogle();
      // Nothing to route on success: the root navigator reacts to the session
      // appearing and sends the deliverer on (or to the code screen, for a
      // realm that reports the address as unverified).
      if (!result.success && !wasCancelled(result.error)) {
        // Dismissing the browser is a choice, not a failure worth a red banner.
        setAuthError(result.error ?? t('auth.errorGoogleSignIn'));
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ThemedStatusBar surface="navy" />
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
                {t('auth.welcome')}
              </Text>
              <Text size={15} color={colors.textSecondary} style={styles.subtitle}>
                {t('auth.welcomeSubtitle')}
              </Text>
            </View>

            {authError ? (
              <View style={styles.errorBanner}>
                <Text size={14} color={colors.danger}>
                  {authError}
                </Text>
              </View>
            ) : null}

            <TextField
              control={control}
              name="email"
              label={t('auth.email')}
              placeholder={t('auth.email')}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              containerStyle={styles.field}
            />

            <PrimaryButton
              label={isSubmitting ? t('common.sending') : t('common.continue')}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting || isGoogleLoading}
              style={styles.submit}
            />

            <OrDivider />
            <GoogleButton onPress={onGoogleLogin} disabled={isGoogleLoading || isSubmitting} />
            <TermsFooter />
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: {
    flex: 1,
    backgroundColor: c.navy,
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
    // scrolling. Shared with the password screen — one field either side of the
    // step, so the card must not jump height between them.
    height: '68%',
    backgroundColor: c.card,
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
    backgroundColor: c.dangerSoft,
  },
  field: {
    marginBottom: Spacing.five,
  },
  submit: {
    marginBottom: Spacing.four,
  },
}));
