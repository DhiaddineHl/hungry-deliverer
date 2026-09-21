import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLocale } from '@/contexts/locale-context';
import { ThemedStatusBar } from '@/components/ui/themed-status-bar';
import { makeStyles } from '@/hooks/use-themed-styles';
import { useColors } from '@/contexts/theme-context';
import { AuthBackdrop } from '@/components/auth/auth-backdrop';
import { IdentityRow } from '@/components/auth/auth-common';
import { TextField } from '@/components/auth/text-field';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Text } from '@/components/ui/text';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { passwordSchema, type PasswordValues } from '@/features/auth/schemas';

/**
 * Step two of signing in, for an address the identification screen found an
 * account for. It only asks for the password — the address is settled, shown
 * back for confirmation, and changed by going back rather than by editing it
 * here.
 *
 * No "don't have an account?" link: an address without an account never
 * reaches this screen.
 */
export default function PasswordScreen() {
  const { t } = useLocale();
  const colors = useColors();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      // Nothing to route on success: the root navigator reacts to the session
      // appearing, and sends an account whose e-mail is still unproven to
      // /verification.
      const result = await login(email, values.password);
      if (!result.success) {
        setAuthError(result.error ?? t('auth.errorLoginFailed'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // back(), not push('/'), so the stack doesn't grow when the deliverer
  // ping-pongs between identification and this screen.
  const goBackToIdentification = () =>
    router.canGoBack() ? router.back() : router.replace('/');

  // Landing here without an address means the screen was opened directly (a
  // deep link, or a reload that lost the param); the identification step is
  // the only thing that can supply one.
  if (!email) {
    return (
      <View style={styles.screen}>
        <ThemedStatusBar surface="navy" />
        <AuthBackdrop />
        <View style={styles.cardWrap}>
          <View style={styles.emptyState}>
            <Text weight="bold" size={22} style={styles.centered}>
              {t('auth.whichAccount')}
            </Text>
            <Text size={15} color={colors.textSecondary} style={styles.emptyBody}>
              {t('auth.whichAccountBody')}
            </Text>
            <PrimaryButton
              label={t('common.continue')}
              onPress={() => router.replace('/')}
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
      {/* No intro here — the backdrop rests where identification left it and
          the navigator's transition provides the motion. */}
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
                {t('auth.welcomeBack')}
              </Text>
              <Text size={15} color={colors.textSecondary} style={styles.subtitle}>
                {t('auth.passwordPrompt')}
              </Text>
            </View>

            <IdentityRow email={email} onChange={goBackToIdentification} />

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
              label={t('auth.password')}
              placeholder={t('auth.password')}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              containerStyle={styles.field}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('auth.forgotPassword')}
              // The address travels along: the reset screen asks for one, and
              // it is the same one we already have.
              onPress={() => router.push({ pathname: '/forgot-password', params: { email } })}
              hitSlop={8}
              style={styles.forgot}>
              <Text weight="semibold" size={14} color={colors.teal}>
                {t('auth.forgotPassword')}
              </Text>
            </Pressable>

            <PrimaryButton
              label={isSubmitting ? 'LOGGING IN…' : 'LOG IN'}
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
    // Matches the identification card: one field either side of the step, so
    // the card must not jump height between them.
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
    marginBottom: Spacing.three,
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
    marginBottom: Spacing.four,
  },
  forgot: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.five,
  },
  submit: {
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
