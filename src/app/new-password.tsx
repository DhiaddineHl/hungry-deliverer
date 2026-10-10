import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { AuthHeading } from '@/components/auth/auth-common';
import { AuthLayout } from '@/components/auth/auth-layout';
import { PrimaryButton } from '@/components/ui/button';
import { ErrorBanner, StateView } from '@/components/ui/feedback';
import { FormTextField } from '@/components/ui/text-field';
import { useToast } from '@/components/ui/toast';
import { useLocale } from '@/contexts/locale-context';
import { useAuth } from '@/contexts/auth-context';
import { newPasswordSchema, type NewPasswordValues } from '@/features/auth/schemas';
import { confirmPasswordReset } from '@/services/api/driver-service';
import { usePasswordResetStore } from '@/store/password-reset-store';

/**
 * The last step of a forgotten-password reset: the new password, typed twice.
 *
 * What authorizes the change is the ticket the accepted code bought, held in
 * memory only. Once the backend has taken it the flow ends here: the deliverer
 * goes back to the front door and signs in with the password they just chose.
 * No session is created on their behalf — a reset proves the mailbox, and
 * logging in is left as its own deliberate act.
 */
export default function NewPasswordScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const showToast = useToast((state) => state.show);
  const email = usePasswordResetStore((state) => state.email);
  const ticket = usePasswordResetStore((state) => state.ticket);
  const origin = usePasswordResetStore((state) => state.origin);
  const clearReset = usePasswordResetStore((state) => state.clear);
  const isActivation = origin === 'activation';
  const { login } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit } = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: NewPasswordValues) => {
    if (!email || !ticket) return;
    setAuthError(null);
    setIsSubmitting(true);
    try {
      await confirmPasswordReset(email, ticket, values.password);

      // An approved applicant is signed straight in with the password they
      // just chose. The code they redeemed has already verified the address
      // (the backend marks it when the password is set), so the root
      // navigator lets the session through with no second code.
      if (isActivation) {
        const result = await login(email, values.password);
        clearReset();
        // On success there is nothing to route: the root navigator reacts to
        // the session appearing and takes it to the map. A failed sign-in
        // still leaves the password set — let them sign in by hand.
        if (!result.success) {
          router.replace({ pathname: '/password', params: { email } });
        }
        return;
      }

      // Read before the store is emptied: it decides where this ends.
      const startedInSettings = origin === 'settings';

      // Nothing of the reset outlives this line: the ticket is spent and the
      // address goes with it.
      clearReset();
      showToast(t('passwordReset.passwordUpdated'));
      // replace, not push: the three reset screens are behind us and none of
      // them can be returned to — the ticket that made them work is gone.
      //
      // A deliverer who changed their password from Settings still holds a
      // valid session — Keycloak's password write does not end it — so they go
      // back to Settings rather than to the front door they never left.
      //
      // Otherwise straight to the password field for this address, with no
      // "first sign-in" hint: whether this was a forgotten password or an
      // approved applicant choosing their first one, it is set now.
      router.replace(
        startedInSettings ? '/settings' : { pathname: '/password', params: { email } }
      );
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : t('passwordReset.errorChange')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // No ticket means nothing here is authorized: the store was cleared (an app
  // restart mid-flow), or this screen was opened directly.
  if (!email || !ticket) {
    return (
      <AuthLayout>
        <StateView icon="lock" title={t('passwordReset.startAgainTitle')} body={t('passwordReset.startAgainBody')}>
          <PrimaryButton label={t('common.startAgain')} onPress={() => router.replace('/forgot-password')} />
        </StateView>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthHeading
        title={isActivation ? t('passwordReset.activateTitle') : t('passwordReset.newPasswordTitle')}
        subtitle={isActivation ? t('passwordReset.activateSubtitle') : t('passwordReset.newPasswordSubtitle')}
      />
      {authError ? <ErrorBanner message={authError} /> : null}
      <FormTextField
        control={control}
        name="password"
        label={t('passwordReset.newPassword')}
        placeholder={t('auth.password')}
        secureTextEntry
        autoComplete="password-new"
        textContentType="newPassword"
        disabled={isSubmitting}
      />
      <FormTextField
        control={control}
        name="confirmPassword"
        label={t('auth.verifyPassword')}
        placeholder={t('auth.verifyPasswordPlaceholder')}
        secureTextEntry
        autoComplete="password-new"
        textContentType="newPassword"
        disabled={isSubmitting}
      />
      <PrimaryButton
        label={isSubmitting ? t('common.saving') : t('passwordReset.savePassword')}
        loading={isSubmitting}
        onPress={handleSubmit(onSubmit)}
      />
    </AuthLayout>
  );
}
