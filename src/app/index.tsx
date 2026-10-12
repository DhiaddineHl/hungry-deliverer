import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { AuthHeading, GoogleButton, OrDivider, TermsFooter } from '@/components/auth/auth-common';
import { AuthLayout } from '@/components/auth/auth-layout';
import { PrimaryButton } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/feedback';
import { FormTextField } from '@/components/ui/text-field';
import { NO_DELIVERER_ACCOUNT, useAuth, wasCancelled } from '@/contexts/auth-context';
import { useLocale } from '@/contexts/locale-context';
import { needsActivation, routeForApplicant, startActivation } from '@/features/auth/applicant-route';
import { identificationSchema, type IdentificationValues } from '@/features/auth/schemas';
import { lookupApplicant } from '@/services/api/driver-request-service';

// The reveal plays only the first time the app is opened in a session. Kept at
// module scope so it survives remounts.
let introPlayed = false;

/**
 * Identification — the single door into the app (A1 Welcome).
 *
 * There is no "log in or apply?" choice: the rider types an address, the
 * backend says whether an account or an application stands behind it, and that
 * answer picks the next screen (password, "under review", or the application
 * form with the address settled).
 */
export default function IdentificationScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { loginWithGoogle } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // The one orchestrated moment: on first launch the sheet rises onto the navy
  // header. Off under Reduce Motion.
  const shouldPlayIntro = !introPlayed && !reduceMotion;
  const progress = useSharedValue(shouldPlayIntro ? 0 : 1);
  useEffect(() => {
    introPlayed = true;
    if (!shouldPlayIntro) return;
    progress.set(withDelay(350, withTiming(1, { duration: 600 })));
  }, [shouldPlayIntro, progress]);

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 0.5, 1], [0, 1, 1]),
    transform: [{ translateY: interpolate(progress.get(), [0, 1], [80, 0]) }],
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
      // Four possible answers: an account (password), an application under
      // review (status), a declined one (apply again) or nothing yet (apply).
      const lookup = await lookupApplicant(email);
      router.push(needsActivation(lookup) ? await startActivation(email) : routeForApplicant(lookup));
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : t('auth.errorServerUnreachable'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onGoogleLogin = async () => {
    setAuthError(null);
    setIsGoogleLoading(true);
    try {
      const result = await loginWithGoogle();
      // Success needs no routing: the root navigator reacts to the session.
      // Dismissing the browser is a choice, not a failure worth a banner.
      if (!result.success && !wasCancelled(result.error)) {
        setAuthError(
          result.error === NO_DELIVERER_ACCOUNT
            ? t('auth.errorNoDelivererAccount')
            : (result.error ?? t('auth.errorGoogleSignIn'))
        );
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const busy = isSubmitting || isGoogleLoading;

  return (
    <AuthLayout sheetStyle={sheetStyle}>
      <AuthHeading title={t('auth.welcome')} subtitle={t('auth.welcomeSubtitle')} />

      {authError ? <ErrorBanner message={authError} /> : null}

      <FormTextField
        control={control}
        name="email"
        label={t('auth.email')}
        placeholder={t('auth.emailPlaceholder')}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="go"
        onSubmitEditing={handleSubmit(onSubmit)}
        disabled={busy}
      />

      <PrimaryButton
        label={isSubmitting ? t('common.sending') : t('common.continue')}
        loading={isSubmitting}
        disabled={isGoogleLoading}
        onPress={handleSubmit(onSubmit)}
      />

      <OrDivider />
      <GoogleButton onPress={onGoogleLogin} loading={isGoogleLoading} disabled={isSubmitting} />
      <TermsFooter />
    </AuthLayout>
  );
}
