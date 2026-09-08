import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/features/auth/schemas';
import { sendPasswordResetCode } from '@/services/api/driver-service';
import { usePasswordResetStore } from '@/store/password-reset-store';

/**
 * Step one of a forgotten-password reset: which address to send the code to.
 *
 * Reached from the password screen, which already knows the address, so the
 * field arrives filled in — but it stays editable: someone who mistyped their
 * way here, or who has two accounts, should not have to walk back to fix it.
 */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const insets = useSafeAreaInsets();
  const startReset = usePasswordResetStore((state) => state.start);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: params.email ?? '' },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    setAuthError(null);
    setIsSubmitting(true);
    try {
      const email = values.email.trim().toLowerCase();
      // Sent from here rather than on arrival at the code screen, so a 404 for
      // an address with no account is answered on the screen that asked for
      // it — and the next screen only ever opens with a code really in flight.
      await sendPasswordResetCode(email);
      startReset(email);
      router.push('/reset-code');
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : 'We could not send the code. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
                Forgot password?
              </Text>
              <Text size={15} color={Colors.textSecondary} style={styles.subtitle}>
                We&apos;ll email you a code to reset it
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

            <PrimaryButton
              label={isSubmitting ? 'SENDING…' : 'SEND CODE'}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              style={styles.submit}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to sign in"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              hitSlop={8}>
              <Text size={14} color={Colors.textSecondary} style={styles.backLink}>
                Remembered it? Go back
              </Text>
            </Pressable>
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
    // Same share of the screen as the identification and password cards, so
    // the backdrop above it never shifts as the deliverer moves between them.
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
    textAlign: 'center',
  },
  errorBanner: {
    padding: Spacing.three,
    marginBottom: Spacing.four,
    borderRadius: Radius.md,
    backgroundColor: '#FDECEA',
  },
  field: {
    marginBottom: Spacing.five,
  },
  submit: {
    marginBottom: Spacing.four,
  },
  backLink: {
    textAlign: 'center',
  },
});
