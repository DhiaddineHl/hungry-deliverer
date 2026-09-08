import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthBackdrop } from '@/components/auth/auth-backdrop';
import { TextField } from '@/components/auth/text-field';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Text } from '@/components/ui/text';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const email = usePasswordResetStore((state) => state.email);
  const ticket = usePasswordResetStore((state) => state.ticket);
  const clearReset = usePasswordResetStore((state) => state.clear);
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

      // Nothing of the reset outlives this line: the ticket is spent and the
      // address goes with it.
      clearReset();
      // replace, not push: the three reset screens are behind us and none of
      // them can be returned to — the ticket that made them work is gone.
      router.replace('/');
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : 'We could not change your password. Please try again.'
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
        <StatusBar style="light" />
        <AuthBackdrop />
        <View style={styles.cardWrap}>
          <View style={styles.emptyState}>
            <Text weight="bold" size={22} style={styles.centered}>
              Start again
            </Text>
            <Text size={15} color={Colors.textSecondary} style={styles.emptyBody}>
              This reset is no longer valid. Ask for a new code and you can choose a new password.
            </Text>
            <PrimaryButton
              label="START AGAIN"
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
      <StatusBar style="light" />
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
                New password
              </Text>
              <Text size={15} color={Colors.textSecondary} style={styles.subtitle}>
                Choose the password you&apos;ll use from now on
              </Text>
              <Text weight="semibold" size={15} style={styles.headingEmail} numberOfLines={1}>
                {email}
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
              name="password"
              label="New Password"
              placeholder="Password"
              secureTextEntry
              autoComplete="password-new"
              textContentType="newPassword"
              containerStyle={styles.field}
            />

            <TextField
              control={control}
              name="confirmPassword"
              label="Verify Password"
              placeholder="Password"
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
    // Two fields and a heading — the same box as the sign-up verification card.
    height: '72%',
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
    textAlign: 'center',
  },
  headingEmail: {
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
});
