import * as WebBrowser from 'expo-web-browser';
import { Pressable, View } from 'react-native';

import { SecondaryButton } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useLocale } from '@/contexts/locale-context';
import { Icon, makeStyles } from '@/theme';

import GoogleMark from '../../../assets/brand/google-g.svg';

const TERMS_URL = 'https://hungry.tn/terms';
const PRIVACY_URL = 'https://hungry.tn/privacy';
const COOKIES_URL = 'https://hungry.tn/cookies';

/** Display heading + subtitle at the top of an auth sheet. */
export function AuthHeading({
  title,
  subtitle,
  overline,
  compact,
}: {
  title: string;
  subtitle?: string;
  /** Small muted line above the title ("Step 2 of 2"). */
  overline?: string;
  /** 24/30 title instead of 28/34 — second steps. */
  compact?: boolean;
}) {
  const styles = useStyles();
  return (
    <View style={styles.heading}>
      {overline ? (
        <Text variant="label" color="inkMuted">
          {overline}
        </Text>
      ) : null}
      <Text variant={compact ? 'title' : 'display'} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? (
        <Text variant="bodySmall" color="inkMuted">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * The address identification settled, shown back on the screens that follow
 * it, with a way to go change it. Those screens never ask for it again.
 */
export function EmailChip({ email, onChange }: { email: string; onChange: () => void }) {
  const { t } = useLocale();
  const styles = useStyles();
  return (
    <View style={styles.chip}>
      <Icon name="mail" size="row" color="inkMuted" />
      <Text variant="itemLabel" numberOfLines={1} style={styles.chipEmail}>
        {email}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('auth.changeEmail')}
        onPress={onChange}
        hitSlop={8}
        style={({ pressed }) => [styles.change, pressed && styles.pressed]}>
        <Text variant="label">{t('auth.change')}</Text>
      </Pressable>
    </View>
  );
}

/** A thin rule with "or" in the middle, above the Google button. */
export function OrDivider() {
  const { t } = useLocale();
  const styles = useStyles();
  return (
    <View style={styles.or} accessibilityElementsHidden>
      <View style={styles.rule} />
      <Text variant="meta" color="inkMuted">
        {t('auth.or')}
      </Text>
      <View style={styles.rule} />
    </View>
  );
}

/**
 * Continue with Google — Keycloak's Google identity provider through the
 * browser (PKCE) flow. A secondary button: navy is kept for the main path.
 */
export function GoogleButton({
  onPress,
  disabled,
  loading,
}: {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { t } = useLocale();
  const styles = useStyles();
  return (
    <View>
      <SecondaryButton
        label={t('auth.loginWithGoogle')}
        onPress={onPress}
        disabled={disabled}
        loading={loading}
      />
      {/* The official multicolour mark sits where the icon slot would be. */}
      {!loading ? (
        <View pointerEvents="none" style={styles.googleMark}>
          <GoogleMark width={20} height={20} />
        </View>
      ) : null}
    </View>
  );
}

/** "By continuing, you accept our Terms, Privacy Policy and Cookies policy." */
export function TermsFooter() {
  const { t } = useLocale();
  const styles = useStyles();
  const open = (url: string) => () => WebBrowser.openBrowserAsync(url);
  return (
    <Text variant="meta" color="inkMuted" style={styles.terms}>
      {t('auth.termsLead')}{' '}
      <Text variant="label" onPress={open(TERMS_URL)} accessibilityRole="link">
        {t('auth.terms')}
      </Text>
      ,{' '}
      <Text variant="label" onPress={open(PRIVACY_URL)} accessibilityRole="link">
        {t('auth.privacyPolicy')}
      </Text>{' '}
      {t('auth.and')}{' '}
      <Text variant="label" onPress={open(COOKIES_URL)} accessibilityRole="link">
        {t('auth.cookiesPolicy')}
      </Text>
      .
    </Text>
  );
}

const useStyles = makeStyles((c, t) => ({
  heading: {
    gap: 6,
  },
  chip: {
    height: t.size.emailChip,
    borderRadius: t.radius.field,
    borderWidth: 1,
    borderColor: c.divider,
    paddingLeft: 14,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chipEmail: {
    flex: 1,
  },
  change: {
    height: 32,
    borderRadius: 16,
    backgroundColor: c.surfaceSunken,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  pressed: {
    opacity: t.opacity.pressed,
  },
  or: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rule: {
    flex: 1,
    height: 1,
    backgroundColor: c.divider,
  },
  googleMark: {
    position: 'absolute',
    left: 18,
    top: 16,
  },
  terms: {
    fontFamily: t.typography.description.fontFamily,
    lineHeight: 20,
  },
}));
