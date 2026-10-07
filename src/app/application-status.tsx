import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthBackdrop } from '@/components/auth/auth-backdrop';
import { IdentityRow } from '@/components/auth/auth-common';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Text } from '@/components/ui/text';
import { ThemedStatusBar } from '@/components/ui/themed-status-bar';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useLocale } from '@/contexts/locale-context';
import { useColors } from '@/contexts/theme-context';
import { needsActivation, routeForApplicant, startActivation } from '@/features/auth/applicant-route';
import { makeStyles } from '@/hooks/use-themed-styles';
import { lookupApplicant } from '@/services/api/driver-request-service';

/**
 * "Application under review" — where identification sends an address whose
 * application is still PENDING, and where a fresh submission lands.
 *
 * There is nothing to do here but wait: staff decide in the back-office, and
 * the backend e-mails the outcome. "Check status" re-asks the same lookup the
 * identification screen does and follows its answer, so an applicant who was
 * just approved goes straight on to setting a password.
 */
export default function ApplicationStatusScreen() {
  const { t } = useLocale();
  const colors = useColors();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email ?? '';
  const [isChecking, setIsChecking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const goToIdentification = () => router.replace('/');

  const checkStatus = async () => {
    setIsChecking(true);
    setError(null);
    setNotice(null);
    try {
      const lookup = await lookupApplicant(email);
      if (lookup.outcome === 'PENDING') {
        setNotice(t('application.stillPending'));
      } else {
        router.replace(
          needsActivation(lookup) ? await startActivation(email) : routeForApplicant(lookup)
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.errorServerUnreachable'));
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ThemedStatusBar surface="navy" />
      <AuthBackdrop />

      <View style={styles.cardWrap}>
        <ScrollView
          contentContainerStyle={[
            styles.cardContent,
            { paddingBottom: insets.bottom + Spacing.five },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={styles.badge}>
            <Ionicons name="hourglass-outline" size={30} color={colors.orange} />
          </View>

          <Text weight="bold" size={22} style={styles.centered}>
            {t('application.pendingTitle')}
          </Text>
          <Text size={15} color={colors.textSecondary} style={styles.body}>
            {t('application.pendingBody', { email: email || '—' })}
          </Text>
          <Text size={14} color={colors.textSecondary} style={styles.body}>
            {t('application.pendingNextSteps')}
          </Text>

          {email ? (
            <View style={styles.identity}>
              <IdentityRow email={email} onChange={goToIdentification} />
            </View>
          ) : null}

          {notice ? (
            <View style={styles.noticeBanner}>
              <Text size={14}>{notice}</Text>
            </View>
          ) : null}
          {error ? (
            <View style={styles.errorBanner}>
              <Text size={14} color={colors.danger}>
                {error}
              </Text>
            </View>
          ) : null}

          {email ? (
            <PrimaryButton
              label={isChecking ? t('common.loading') : t('application.checkStatus')}
              onPress={checkStatus}
              disabled={isChecking}
              style={styles.button}
            />
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('application.useAnotherEmail')}
            onPress={goToIdentification}
            hitSlop={8}>
            <Text weight="semibold" size={14} color={colors.teal} style={styles.centered}>
              {t('application.useAnotherEmail')}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: {
    flex: 1,
    backgroundColor: c.navy,
  },
  cardWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // Same share as the identification card, so the backdrop does not jump.
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
  badge: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.orangeSoft,
    marginBottom: Spacing.four,
  },
  centered: {
    textAlign: 'center',
  },
  body: {
    marginTop: Spacing.two,
    textAlign: 'center',
    lineHeight: 22,
  },
  identity: {
    marginTop: Spacing.five,
  },
  noticeBanner: {
    padding: Spacing.three,
    marginBottom: Spacing.four,
    borderRadius: Radius.md,
    backgroundColor: c.orangeSoft,
  },
  errorBanner: {
    padding: Spacing.three,
    marginBottom: Spacing.four,
    borderRadius: Radius.md,
    backgroundColor: c.dangerSoft,
  },
  button: {
    marginTop: Spacing.two,
    marginBottom: Spacing.four,
  },
}));
