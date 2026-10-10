import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { AuthHeading } from '@/components/auth/auth-common';
import { AuthLayout } from '@/components/auth/auth-layout';
import { PrimaryButton, TextLink } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/feedback';
import { FormTextField } from '@/components/ui/text-field';
import { useAuth } from '@/contexts/auth-context';
import { useLocale } from '@/contexts/locale-context';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/features/auth/schemas';
import { sendPasswordResetCode } from '@/services/api/driver-service';
import { usePasswordResetStore } from '@/store/password-reset-store';
import { makeStyles } from '@/theme';

/**
 * Step one of a forgotten-password reset (A4): which address gets the code.
 * Reached from the password screen, so the field arrives filled in — but it
 * stays editable for someone who mistyped their way here.
 */
export default function ForgotPasswordScreen() {
  const { t } = useLocale();
  const styles = useStyles();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const startReset = usePasswordResetStore((state) => state.start);
  const { isAuthenticated } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: params.email ?? '' },
  });

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const onSubmit = async (values: ForgotPasswordValues) => {
    setAuthError(null);
    setIsSubmitting(true);
    try {
      const email = values.email.trim().toLowerCase();
      // Sent from here, so a 404 for an address with no account is answered on
      // the screen that asked for it.
      await sendPasswordResetCode(email);
      // A session here means a deliberate change that came through Settings;
      // recording that keeps the flow exempt from the root navigator's bounce.
      startReset(email, isAuthenticated ? 'settings' : 'login');
      router.push('/reset-code');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : t('passwordReset.errorSend'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout onBack={goBack}>
      <AuthHeading title={t('passwordReset.forgotTitle')} subtitle={t('passwordReset.forgotSubtitle')} />
      {authError ? <ErrorBanner message={authError} /> : null}
      <FormTextField
        control={control}
        name="email"
        label={t('auth.email')}
        placeholder={t('auth.emailPlaceholder')}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        disabled={isSubmitting}
      />
      <PrimaryButton
        label={isSubmitting ? t('common.sending') : t('passwordReset.sendCode')}
        loading={isSubmitting}
        onPress={handleSubmit(onSubmit)}
      />
      <TextLink label={t('passwordReset.goBack')} onPress={goBack} style={styles.centered} />
    </AuthLayout>
  );
}

const useStyles = makeStyles(() => ({
  centered: {
    alignSelf: 'center',
  },
}));
