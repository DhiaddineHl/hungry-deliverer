import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { EmailChip } from '@/components/auth/auth-common';
import { AuthLayout } from '@/components/auth/auth-layout';
import { PrimaryButton, TextLink } from '@/components/ui/button';
import { ErrorBanner, InfoNote, StateView } from '@/components/ui/feedback';
import { Text } from '@/components/ui/text';
import { useLocale } from '@/contexts/locale-context';
import { needsActivation, routeForApplicant, startActivation } from '@/features/auth/applicant-route';
import { lookupApplicant } from '@/services/api/driver-request-service';
import { makeStyles } from '@/theme';

/**
 * "Application under review" — where identification sends an address whose
 * application is still PENDING. Nothing to do but wait; "Check status" re-asks
 * the same lookup and follows its answer, so an applicant who was just
 * approved goes straight on to setting a password.
 */
export default function ApplicationStatusScreen() {
  const { t } = useLocale();
  const styles = useStyles();
  const router = useRouter();
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
        router.replace(needsActivation(lookup) ? await startActivation(email) : routeForApplicant(lookup));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.errorServerUnreachable'));
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <AuthLayout onBack={goToIdentification}>
      <StateView
        icon="pending"
        tone="primary"
        title={t('application.pendingTitle')}
        body={t('application.pendingBody', { email: email || '—' })}
      />
      <Text variant="description" color="inkMuted" align="center" style={styles.steps}>
        {t('application.pendingNextSteps')}
      </Text>

      {email ? <EmailChip email={email} onChange={goToIdentification} /> : null}
      {notice ? <InfoNote>{notice}</InfoNote> : null}
      {error ? <ErrorBanner message={error} /> : null}

      {email ? (
        <PrimaryButton
          label={isChecking ? t('application.checking') : t('application.checkStatus')}
          loading={isChecking}
          onPress={checkStatus}
        />
      ) : null}
      <TextLink label={t('application.useAnotherEmail')} onPress={goToIdentification} style={styles.centered} />
    </AuthLayout>
  );
}

const useStyles = makeStyles(() => ({
  steps: {
    alignSelf: 'center',
    maxWidth: 300,
    marginTop: -8,
  },
  centered: {
    alignSelf: 'center',
  },
}));
