import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Switch, View } from 'react-native';

import { PageShell } from '@/components/ui/page-shell';
import { Card, RowDivider, SectionTitle } from '@/components/ui/section';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useLocale } from '@/contexts/locale-context';
import { useColors, useTheme, type ThemeMode } from '@/contexts/theme-context';
import { useSession } from '@/features/session/session-context';
import { useDriver } from '@/hooks/use-driver';
import { makeStyles } from '@/hooks/use-themed-styles';
import { sendPasswordResetCode } from '@/services/api/driver-service';
import type { TranslationKey } from '@/i18n';
import { usePasswordResetStore } from '@/store/password-reset-store';

const TERMS_URL = 'https://hungry.tn/terms';
const PRIVACY_URL = 'https://hungry.tn/privacy';

const APPEARANCE_LABELS: Record<ThemeMode, TranslationKey> = {
  system: 'appearance.system',
  light: 'appearance.light',
  dark: 'appearance.dark',
};

/** Left icon column width, so the dividers line up under the labels. */
const ICON_COLUMN = 48;

type ValueRowProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  onPress?: () => void;
  /** Shows a spinner in place of the chevron while an action is in flight. */
  isBusy?: boolean;
};

/**
 * Icon + stacked label/value + chevron.
 *
 * The chevron is part of the frame, so it is drawn either way, but the row only
 * becomes pressable when it leads somewhere — a tap that visibly responds and
 * then does nothing reads as a bug.
 */
function ValueRow({ icon, label, value, onPress, isBusy }: ValueRowProps) {
  const { t } = useLocale();
  const colors = useColors();
  const styles = useStyles();

  const body = (
    <>
      <View style={styles.iconColumn}>{icon}</View>
      <View style={styles.rowText}>
        <Text size={14} color={colors.textMuted}>
          {label}
        </Text>
        <Text size={17} numberOfLines={1}>
          {value}
        </Text>
      </View>
      {isBusy ? (
        <ActivityIndicator color={colors.textMuted} />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      )}
    </>
  );

  if (!onPress) {
    return (
      <View accessibilityLabel={`${label}: ${value}`} style={styles.row}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityHint={t('settings.editHint')}
      onPress={onPress}
      disabled={isBusy}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {body}
    </Pressable>
  );
}

/**
 * Account details, app preferences and the legal links.
 *
 * The account rows are live: they read the driver record and each one opens an
 * editor that writes through `PUT /drivers`, which mirrors the change onto the
 * linked Keycloak user. Values fall back to the token claims while the record
 * loads — the same precedence the drawer uses — so the screen never shows an
 * empty row it could have filled.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const { t, language } = useLocale();
  const { isDark, mode, setMode } = useTheme();
  const colors = useColors();
  const styles = useStyles();
  const { user, logout } = useAuth();
  const { actions } = useSession();
  const { data: driver, isLoading, isError, refetch } = useDriver(user?.sub);
  const startReset = usePasswordResetStore((state) => state.start);

  const [isSendingCode, setIsSendingCode] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const fullName = driver?.fullname
    ? `${driver.fullname.firstName ?? ''} ${driver.fullname.lastName ?? ''}`.trim()
    : '';
  const displayName = fullName || driver?.name || user?.name || t('common.notSet');
  const email = driver?.contact?.email ?? user?.email ?? '—';
  const phone = driver?.contact?.phones?.[0] ?? user?.phoneNumber ?? t('common.notSet');
  const appVersion = Constants.expoConfig?.version ?? '1.0';

  // Editing needs the record itself: the update is addressed by its `code`, and
  // the fields it does not touch are rebuilt from it.
  const canEdit = !!driver;
  const edit = (field: 'name' | 'email' | 'phone') => () =>
    router.push({ pathname: '/edit-profile', params: { field } });

  /**
   * The backend has no "change my password while signed in" endpoint — the
   * password-reset trio is its only writer — so a change starts the very same
   * flow, mailing a code to the address on the account. Marking the origin is
   * what lets a session onto those screens and brings it back here afterwards.
   */
  const changePassword = async () => {
    const address = driver?.contact?.email ?? user?.email;
    if (!address || isSendingCode) return;
    setPasswordError(null);
    setIsSendingCode(true);
    try {
      await sendPasswordResetCode(address);
      startReset(address, 'settings');
      router.push('/reset-code');
    } catch (error) {
      setPasswordError(
        error instanceof Error ? error.message : t('passwordReset.errorSend')
      );
    } finally {
      setIsSendingCode(false);
    }
  };

  const signOut = async () => {
    actions.stopSession();
    await logout();
    router.replace('/');
  };

  return (
    <PageShell title={t('settings.title')}>
      <SectionTitle>{t('settings.account')}</SectionTitle>

      {isError ? (
        <Card style={styles.group}>
          <View style={styles.notice}>
            <Text size={15} color={colors.textSecondary} style={styles.noticeText}>
              {t('settings.loadFailed')}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => refetch()} hitSlop={8}>
              <Text weight="semibold" size={15} color={colors.teal}>
                {t('common.retry')}
              </Text>
            </Pressable>
          </View>
        </Card>
      ) : (
        <Card style={styles.group}>
          <ValueRow
            icon={<Ionicons name="person-outline" size={24} color={colors.navy} />}
            label={t('settings.fullName')}
            value={isLoading ? t('common.loading') : displayName}
            onPress={canEdit ? edit('name') : undefined}
          />
          <RowDivider inset={ICON_COLUMN} />
          <ValueRow
            icon={<Ionicons name="mail-outline" size={24} color={colors.navy} />}
            label={t('settings.emailAddress')}
            value={isLoading ? t('common.loading') : email}
            onPress={canEdit ? edit('email') : undefined}
          />
          <RowDivider inset={ICON_COLUMN} />
          <ValueRow
            icon={<Ionicons name="phone-portrait-outline" size={24} color={colors.navy} />}
            label={t('settings.phoneNumber')}
            value={isLoading ? t('common.loading') : phone}
            onPress={canEdit ? edit('phone') : undefined}
          />
          <RowDivider inset={ICON_COLUMN} />
          <ValueRow
            icon={<Ionicons name="lock-closed-outline" size={24} color={colors.navy} />}
            label={t('settings.password')}
            value={isSendingCode ? t('settings.sendingCode') : t('settings.passwordMask')}
            onPress={changePassword}
            isBusy={isSendingCode}
          />
        </Card>
      )}

      {passwordError ? (
        <View style={styles.errorBanner}>
          <Text size={14} color={colors.danger}>
            {passwordError}
          </Text>
        </View>
      ) : null}

      <SectionTitle>{t('settings.appPreferences')}</SectionTitle>
      <Card style={styles.group}>
        <ValueRow
          icon={<MaterialIcons name="translate" size={24} color={colors.navy} />}
          label={t('settings.language')}
          value={t(language === 'fr' ? 'language.french' : 'language.english')}
          onPress={() => router.push('/language')}
        />
        <RowDivider inset={ICON_COLUMN} />
        <ValueRow
          icon={<Ionicons name="contrast-outline" size={24} color={colors.navy} />}
          label={t('settings.appearance')}
          value={t(APPEARANCE_LABELS[mode])}
          onPress={() => router.push('/appearance')}
        />
        <RowDivider inset={ICON_COLUMN} />
        <View style={styles.row}>
          <View style={styles.iconColumn}>
            <Ionicons name="moon-outline" size={24} color={colors.navy} />
          </View>
          <Text size={17} style={styles.rowText}>
            {t('settings.darkMode')}
          </Text>
          {/*
            The quick switch and the Appearance page are the same setting seen
            two ways. Flipping it here pins the app, rather than leaving it on
            'system' — someone reaching for a switch is asking for an answer,
            not for a rule.
          */}
          <Switch
            value={isDark}
            onValueChange={(on) => setMode(on ? 'dark' : 'light')}
            accessibilityLabel={t('settings.darkMode')}
            trackColor={{ false: colors.disabled, true: colors.orange }}
            thumbColor={colors.onNavy}
          />
        </View>
      </Card>

      <SectionTitle>{t('settings.legal')}</SectionTitle>
      <Card style={styles.group}>
        <LegalRow label={t('settings.termsOfService')} url={TERMS_URL} />
        <RowDivider />
        <LegalRow label={t('settings.privacyPolicy')} url={PRIVACY_URL} />
      </Card>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('settings.signOut')}
        onPress={signOut}
        style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}>
        <Ionicons name="exit-outline" size={22} color={colors.danger} />
        <Text weight="bold" size={17} color={colors.danger}>
          {t('settings.signOut')}
        </Text>
      </Pressable>

      <Text size={15} color={colors.textMuted} style={styles.version}>
        {t('settings.appVersion', { version: appVersion })}
      </Text>
    </PageShell>
  );
}

/** A legal document, opened in the in-app browser rather than a new screen. */
function LegalRow({ label, url }: { label: string; url: string }) {
  const colors = useColors();
  const styles = useStyles();

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => WebBrowser.openBrowserAsync(url)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Text size={17} style={styles.rowText}>
        {label}
      </Text>
      <Ionicons name="open-outline" size={22} color={colors.textMuted} />
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  group: {
    marginBottom: Spacing.six,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingVertical: Spacing.three,
  },
  iconColumn: {
    width: ICON_COLUMN,
  },
  rowText: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.four,
  },
  noticeText: {
    flex: 1,
  },
  errorBanner: {
    padding: Spacing.three,
    marginTop: -Spacing.five,
    marginBottom: Spacing.five,
    borderRadius: Radius.md,
    backgroundColor: c.dangerSoft,
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 56,
    marginTop: Spacing.two,
    marginHorizontal: Spacing.four,
    borderRadius: Radius.lg,
    backgroundColor: c.dangerSoft,
  },
  version: {
    marginTop: Spacing.four,
    textAlign: 'center',
  },
}));
