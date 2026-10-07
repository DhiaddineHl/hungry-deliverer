import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLocale } from '@/contexts/locale-context';
import { ThemedStatusBar } from '@/components/ui/themed-status-bar';
import { makeStyles } from '@/hooks/use-themed-styles';
import { useColors } from '@/contexts/theme-context';
import { AuthBackdrop } from '@/components/auth/auth-backdrop';
import { TextField } from '@/components/auth/text-field';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Text } from '@/components/ui/text';
import { Radius, Shadow, Spacing } from '@/constants/theme';
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
  const colors = useColors();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      <View style={styles.screen}>
        <ThemedStatusBar surface="navy" />
        <AuthBackdrop />
        <View style={styles.cardWrap}>
          <View style={styles.emptyState}>
            <Text weight="bold" size={22} style={styles.centered}>
              {t('passwordReset.startAgainTitle')}
            </Text>
            <Text size={15} color={colors.textSecondary} style={styles.emptyBody}>
              {t('passwordReset.startAgainBody')}
            </Text>
            <PrimaryButton
              label={t('common.startAgain')}
              onPress={() => router.replace('/forgot-password')}
              style={styles.emptyButton}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ThemedStatusBar surface="navy" />
      <AuthBackdrop />

      <View style={styles.cardWrap}>
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
                {isActivation ? t('passwordReset.activateTitle') : 'New password'}
              </Text>
              <Text size={15} color={colors.textSecondary} style={styles.subtitle}>
                {isActivation
                  ? t('passwordReset.activateSubtitle')
                  : 'Choose the password you’ll use from now on'}
              </Text>
              <Text weight="semibold" size={15} style={styles.headingEmail} numberOfLines={1}>
                {email}
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
              name="password"
              label={t('passwordReset.newPassword')}
              placeholder={t('auth.password')}
              secureTextEntry
              autoComplete="password-new"
              textContentType="newPassword"
              containerStyle={styles.field}
            />

            <TextField
              control={control}
              name="confirmPassword"
              label={t('auth.verifyPassword')}
              placeholder={t('auth.password')}
              secureTextEntry
              autoComplete="password-new"
              textContentType="newPassword"
              containerStyle={styles.field}
            />

            <PrimaryButton
              label={isSubmitting ? 'SAVING…' : 'SAVE PASSWORD'}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              style={styles.submit}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
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
    // Two fields and a heading — the same box as the sign-up verification card.
    height: '72%',
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
    textAlign: 'center',
  },
  headingEmail: {
    marginTop: Spacing.one,
  },
  errorBanner: {
    padding: Spacing.three,
    marginBottom: Spacing.four,
    borderRadius: Radius.md,
    backgroundColor: c.dangerSoft,
  },
  field: {
    marginBottom: Spacing.four,
  },
  submit: {
    marginTop: Spacing.one,
    marginBottom: Spacing.four,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
  },
  centered: {
    textAlign: 'center',
  },
  emptyBody: {
    marginTop: Spacing.two,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyButton: {
    marginTop: Spacing.five,
  },
}));
