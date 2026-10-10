import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { View } from 'react-native';

import { useVehicleLabel, vehicleIcon } from '@/components/sheets/session-sheets';
import { Card, Divider, ListGroup, ListRow, Overline } from '@/components/ui/content';
import { ErrorBanner, Skeleton } from '@/components/ui/feedback';
import { Page } from '@/components/ui/page';
import { SegmentedControl, Toggle } from '@/components/ui/selection';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/contexts/auth-context';
import { useLocale } from '@/contexts/locale-context';
import { useSession } from '@/features/session/session-context';
import { useDriver } from '@/hooks/use-driver';
import { sendPasswordResetCode } from '@/services/api/driver-service';
import { usePasswordResetStore } from '@/store/password-reset-store';
import { Icon, makeStyles, useTheme } from '@/theme';

const TERMS_URL = 'https://hungry.tn/terms';
const PRIVACY_URL = 'https://hungry.tn/privacy';

/**
 * S1/S2 — account details, preferences, vehicle, legal and the session.
 *
 * The account rows are live: they read the driver record and each opens an
 * editor that writes through `PUT /drivers`. While the record loads the rows
 * are skeletons in their own shape; if it fails, a banner says so with a retry
 * and the rest of the page stays usable.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const { t, language, setLanguage } = useLocale();
  const { isDark, setMode } = useTheme();
  const styles = useStyles();
  const { user, logout } = useAuth();
  const { actions } = useSession();
  const { data: driver, isLoading, isError, refetch } = useDriver(user?.sub);
  const startReset = usePasswordResetStore((state) => state.start);
  const vehicleLabel = useVehicleLabel(driver?.vehicle);

  const [isSendingCode, setIsSendingCode] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const fullName = driver?.fullname
    ? `${driver.fullname.firstName ?? ''} ${driver.fullname.lastName ?? ''}`.trim()
    : '';
  const displayName = fullName || driver?.name || user?.name || t('common.notSet');
  const email = driver?.contact?.email ?? user?.email ?? t('common.notSet');
  const phone = driver?.contact?.phones?.[0] ?? user?.phoneNumber ?? t('common.notSet');
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  // Editing needs the record itself: the update is addressed by its `code`.
  const canEdit = !!driver;
  const edit = (field: 'name' | 'email' | 'phone') =>
    canEdit ? () => router.push({ pathname: '/edit-profile', params: { field } }) : undefined;

  /**
   * The backend has no "change my password while signed in" endpoint — the
   * password-reset trio is its only writer — so a change starts that flow,
   * mailing a code to the account's address.
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
      setPasswordError(error instanceof Error ? error.message : t('passwordReset.errorSend'));
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
    <Page title={t('settings.title')}>
      <Overline style={styles.overlineFirst}>{t('settings.account')}</Overline>
      {isError ? (
        <ErrorBanner
          message={t('settings.loadFailed')}
          actionLabel={t('common.retry')}
          onAction={() => refetch()}
          style={styles.banner}
        />
      ) : null}
      {isLoading ? (
        <Card>
          {[0, 1, 2, 3].map((index) => (
            <View key={index}>
              {index > 0 ? <Divider inset={66} /> : null}
              <View style={styles.skeletonRow}>
                <Skeleton width={36} height={36} radius={12} />
                <View style={styles.skeletonText}>
                  <Skeleton width={72} height={12} />
                  <Skeleton width="70%" height={16} />
                </View>
              </View>
            </View>
          ))}
        </Card>
      ) : (
        <ListGroup>
          <ListRow icon="user" caption={t('settings.fullName')} label={displayName} onPress={edit('name')} accessibilityHint={t('settings.editHint')} />
          <ListRow icon="mail" caption={t('settings.emailAddress')} label={email} onPress={edit('email')} accessibilityHint={t('settings.editHint')} />
          <ListRow icon="smartphone" caption={t('settings.phoneNumber')} label={phone} onPress={edit('phone')} accessibilityHint={t('settings.editHint')} />
          <ListRow
            icon="lock"
            caption={t('settings.password')}
            label={isSendingCode ? t('settings.sendingCode') : t('settings.passwordMask')}
            onPress={changePassword}
            trailing={isSendingCode ? <Spinner /> : undefined}
          />
        </ListGroup>
      )}
      {passwordError ? <ErrorBanner message={passwordError} style={styles.bannerBelow} /> : null}

      <Overline style={styles.overline}>{t('settings.preferences')}</Overline>
      <ListGroup>
        <ListRow
          icon="language"
          label={t('settings.language')}
          trailing={
            <SegmentedControl
              size="small"
              segments={[
                { key: 'en', label: t('language.english') },
                { key: 'fr', label: t('language.french') },
              ]}
              value={language}
              onChange={setLanguage}
            />
          }
        />
        <ListRow
          icon="darkMode"
          label={t('settings.darkMode')}
          trailing={
            <Toggle
              value={isDark}
              // A switch is a request for an answer, not a rule: flipping it
              // pins the app rather than leaving it on "follow the system".
              onValueChange={(on) => setMode(on ? 'dark' : 'light')}
              accessibilityLabel={t('settings.darkMode')}
            />
          }
        />
      </ListGroup>

      <Overline style={styles.overline}>{t('settings.vehicle')}</Overline>
      <ListGroup>
        <ListRow
          icon={vehicleIcon(driver?.vehicle?.type)}
          caption={t('settings.vehicle')}
          label={vehicleLabel ?? t('delivery.vehicleUnknown')}
        />
      </ListGroup>

      <Overline style={styles.overline}>{t('settings.legal')}</Overline>
      <ListGroup>
        <ListRow
          icon="terms"
          label={t('settings.termsOfService')}
          onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)}
          trailing={<Icon name="externalLink" size="row" color="inkMuted" />}
        />
        <ListRow
          icon="privacy"
          label={t('settings.privacyPolicy')}
          onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}
          trailing={<Icon name="externalLink" size="row" color="inkMuted" />}
        />
      </ListGroup>

      <Overline style={styles.overline}>{t('settings.session')}</Overline>
      <ListGroup>
        <ListRow icon="logout" label={t('settings.signOut')} onPress={signOut} destructive />
      </ListGroup>

      <Text variant="caption" color="inkSubtle" align="center" style={styles.version}>
        {t('settings.appVersion', { version: appVersion })}
      </Text>
    </Page>
  );
}

const useStyles = makeStyles(() => ({
  overlineFirst: {
    marginTop: 16,
    marginBottom: 8,
  },
  overline: {
    marginTop: 24,
    marginBottom: 8,
  },
  banner: {
    marginBottom: 12,
  },
  bannerBelow: {
    marginTop: 12,
  },
  skeletonRow: {
    minHeight: 60,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  skeletonText: {
    flex: 1,
    gap: 6,
  },
  version: {
    marginTop: 24,
  },
}));
