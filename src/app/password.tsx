import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { AuthHeading, EmailChip } from '@/components/auth/auth-common';
import { AuthLayout } from '@/components/auth/auth-layout';
import { PrimaryButton, TextLink } from '@/components/ui/button';
import { ErrorBanner, StateView } from '@/components/ui/feedback';
import { FormTextField } from '@/components/ui/text-field';
import { NO_DELIVERER_ACCOUNT, useAuth } from '@/contexts/auth-context';
import { useLocale } from '@/contexts/locale-context';
import { passwordSchema, type PasswordValues } from '@/features/auth/schemas';
import { makeStyles } from '@/theme';

/**
 * Step two of signing in, for an address identification found an account
 * for. The address is settled and shown back in a chip; it changes by going
 * back, not by editing it here.
 */
export default function PasswordScreen() {
  const { t } = useLocale();
  const styles = useStyles();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email ?? '';
  const { login } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '' },
  });

  const onSubmit = async (values: PasswordValues) => {
    setAuthError(null);
    setIsSubmitting(true);
    try {
      // Success needs no routing: the root navigator reacts to the session (and
      // sends an unverified address to /verification).
      const result = await login(email, values.password);
      if (!result.success) {
        setAuthError(
          result.error === NO_DELIVERER_ACCOUNT
            ? t('auth.errorNotRider')
            : (result.error ?? t('auth.errorLoginFailed'))
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // back(), not push('/'), so the stack doesn't grow on a ping-pong.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  // Opened without an address (deep link, reload that lost the param): only
  // identification can supply one.
  if (!email) {
    return (
      <AuthLayout>
        <StateView icon="mail" title={t('auth.whichAccount')} body={t('auth.whichAccountBody')}>
          <PrimaryButton label={t('common.startAgain')} onPress={() => router.replace('/')} />
        </StateView>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout onBack={goBack}>
      <AuthHeading title={t('auth.welcomeBack')} subtitle={t('auth.passwordPrompt')} />
      <EmailChip email={email} onChange={goBack} />

      {authError ? <ErrorBanner message={authError} /> : null}

      <View style={styles.field}>
        <FormTextField
          control={control}
          name="password"
          label={t('auth.password')}
          placeholder={t('auth.password')}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          autoFocus
          returnKeyType="go"
          onSubmitEditing={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        />
        <TextLink
          label={t('auth.forgotPassword')}
          // The address travels along: the reset form asks for the same one.
          onPress={() => router.push({ pathname: '/forgot-password', params: { email } })}
          disabled={isSubmitting}
          style={styles.forgot}
        />
      </View>

      <PrimaryButton
        label={isSubmitting ? t('auth.loggingIn') : t('auth.logIn')}
        loading={isSubmitting}
        onPress={handleSubmit(onSubmit)}
      />
    </AuthLayout>
  );
}

const useStyles = makeStyles(() => ({
  field: {
    gap: 12,
  },
  forgot: {
    alignSelf: 'flex-end',
  },
}));
