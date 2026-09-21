import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { useLocale } from '@/contexts/locale-context';
import { makeStyles } from '@/hooks/use-themed-styles';
import { useColors } from '@/contexts/theme-context';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';

/** "———— Or ————" separator above the social button. */
export function OrDivider() {
  const colors = useColors();
  const styles = useStyles();
  return (
    <Text size={14} color={colors.textSecondary} style={styles.orText}>
      Or
    </Text>
  );
}

/**
 * The white "Log in with Google" button. Drives Keycloak's Google identity
 * provider through the browser (PKCE) flow — see the auth context.
 */
export function GoogleButton({
  onPress,
  disabled,
}: {
  onPress: () => void;
  disabled?: boolean;
}) {
  const { t } = useLocale();
  const colors = useColors();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.google,
        (pressed || disabled) && styles.pressed,
      ]}>
      {/* Google's mark; stand-in glyph until the brand asset is added. */}
      <View style={styles.googleMark}>
        <Ionicons name="logo-google" size={20} color="#4285F4" />
      </View>
      <Text weight="semibold" size={15} color={colors.text}>
        {t('auth.loginWithGoogle')}
      </Text>
    </Pressable>
  );
}

/**
 * The address identification settled, shown back on the screens that follow it
 * (password and sign-up) with a way to go change it. Neither screen asks for
 * the address again, so this is the only place it appears there.
 */
export function IdentityRow({ email, onChange }: { email: string; onChange: () => void }) {
  const { t } = useLocale();
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={styles.identityRow}>
      <Text weight="medium" size={15} numberOfLines={1} style={styles.identityEmail}>
        {email}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('passwordReset.changeEmail')}
        onPress={onChange}
        hitSlop={8}>
        <Text weight="bold" size={13} color={colors.orange}>
          {t('auth.change')}
        </Text>
      </Pressable>
    </View>
  );
}

/** The fine-print consent line under the social button. */
export function TermsFooter() {
  const { t } = useLocale();
  const colors = useColors();
  const styles = useStyles();
  return (
    <Text size={12} color={colors.textMuted} style={styles.terms}>
      By continuing, you automatically accept our{' '}
      <Text size={12} color={colors.textSecondary} style={styles.link}>
        Terms & Conditions
      </Text>
      ,{' '}
      <Text size={12} color={colors.textSecondary} style={styles.link}>
        {t('auth.privacyPolicy')}
      </Text>{' '}
      and{' '}
      <Text size={12} color={colors.textSecondary} style={styles.link}>
        {t('auth.cookiesPolicy')}
      </Text>
    </Text>
  );
}

const useStyles = makeStyles((c) => ({
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.five,
  },
  identityEmail: {
    flexShrink: 1,
  },
  orText: {
    textAlign: 'center',
    marginVertical: Spacing.three,
  },
  google: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    height: 56,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
  },
  googleMark: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  terms: {
    textAlign: 'center',
    marginTop: Spacing.five,
    lineHeight: 18,
  },
  link: {
    textDecorationLine: 'underline',
  },
}));
