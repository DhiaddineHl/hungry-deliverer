import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AuthHeading } from '@/components/auth/auth-common';
import { AuthLayout } from '@/components/auth/auth-layout';
import { CodeEntry } from '@/components/auth/code-entry';
import { type OtpInputHandle } from '@/components/auth/otp-input';
import { PrimaryButton, TextLink } from '@/components/ui/button';
import { ErrorBanner, InfoNote, StateView } from '@/components/ui/feedback';
import { useLocale } from '@/contexts/locale-context';
import { makeStyles } from '@/theme';
import { isApiError } from '@/services/api/client';
import { sendPasswordResetCode, verifyPasswordResetCode } from '@/services/api/driver-service';
import { usePasswordResetStore } from '@/store/password-reset-store';

/**
 * Boxes drawn before the backend has said otherwise. Must match
 * `hungry.driver.password-reset.code-length` (default 6); a resend answers
 * with the authoritative `codeLength`, which replaces this.
 */
const DEFAULT_CODE_LENGTH = 6;

/**
 * Mirrors `hungry.driver.password-reset.resend-cooldown-seconds`. The backend
 * enforces it; this only keeps the button from being pressed into a guaranteed
 * 429.
 */
const DEFAULT_RESEND_COOLDOWN = 60;

/**
 * Step two of a forgotten-password reset: the code that proves the mailbox is
 * theirs.
 *
 * Only ever reached from `/forgot-password`, which has already sent a code —
 * so unlike the sign-up verification screen this one never sends on arrival,
 * and Resend is the single way another code goes out. An accepted code buys a
 * ticket, and the ticket is what the last screen spends.
 */
export default function ResetCodeScreen() {
  const { t } = useLocale();
  const styles = useStyles();
  const email = usePasswordResetStore((state) => state.email);
  const setTicket = usePasswordResetStore((state) => state.setTicket);
  // An approved applicant activating their account rather than someone who
  // forgot a password: their way back is identification, not the reset form.
  const isActivation = usePasswordResetStore((state) => state.origin === 'activation');
  const restartRoute = isActivation ? '/' : '/forgot-password';

  const [codeLength, setCodeLength] = useState(DEFAULT_CODE_LENGTH);
  const [code, setCode] = useState<string[]>(() => Array(DEFAULT_CODE_LENGTH).fill(''));
  const [timer, setTimer] = useState(DEFAULT_RESEND_COOLDOWN);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const otpRef = useRef<OtpInputHandle>(null);
  const fullCode = code.join('');
  const isComplete = fullCode.length === codeLength;

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleResend = useCallback(async () => {
    if (!email || timer > 0 || isResending) return;
    setError(null);
    setIsResending(true);
    try {
      const challenge = await sendPasswordResetCode(email);
      setCodeLength(challenge.codeLength);
      setCode(Array(challenge.codeLength).fill(''));
      setTimer(challenge.resendAvailableInSeconds || DEFAULT_RESEND_COOLDOWN);
      // A backend with no mail transport only logs the code (see the dev
      // properties). Saying so beats letting the deliverer wait for an e-mail
      // that was never going to arrive.
      setNotice(
        challenge.delivered
          ? null
          : t('verification.noMailTransport')
      );
      otpRef.current?.focusFirst();
    } catch (err) {
      // 429 is the cool-down, and it tells us exactly how long is left —
      // adopt that instead of guessing, so the button and the server agree.
      if (isApiError(err, 429)) {
        const retryAfter = err.data?.retryAfterSeconds;
        if (typeof retryAfter === 'number') setTimer(Math.ceil(retryAfter));
      }
      setError(err instanceof Error ? err.message : t('passwordReset.errorSend'));
    } finally {
      setIsResending(false);
    }
  }, [email, timer, isResending, t]);

  const handleCodeChange = (next: string[]) => {
    setCode(next);
    setError(null);
  };

  const handleVerify = async () => {
    if (!email || !isComplete || isVerifying) return;
    setError(null);
    setNotice(null);
    setIsVerifying(true);
    try {
      const { ticket } = await verifyPasswordResetCode(email, fullCode);
      setTicket(ticket);
      router.push('/new-password');
    } catch (err) {
      // 410 (expired) and 429 (attempts used up) both mean the code is dead:
      // point at Resend instead of letting the deliverer retype a corpse.
      if (isApiError(err, 410) || isApiError(err, 429)) {
        setTimer(0);
        setCode(Array(codeLength).fill(''));
      }
      setError(err instanceof Error ? err.message : t('verification.errorVerify'));
    } finally {
      setIsVerifying(false);
    }
  };

  // The store was cleared (an app restart mid-flow), so there is no address to
  // check a code against and nothing was ever sent.
  if (!email) {
    return (
      <AuthLayout>
        <StateView icon="mail" title={t('passwordReset.nothingToReset')} body={t('passwordReset.nothingToResetBody')}>
          <PrimaryButton label={t('common.startAgain')} onPress={() => router.replace(restartRoute)} />
        </StateView>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout onBack={() => router.replace(restartRoute)}>
      <AuthHeading
        title={isActivation ? t('passwordReset.activateTitle') : t('passwordReset.resetTitle')}
        subtitle={`${t('passwordReset.sentCodeTo')} ${email}`}
      />

      {notice && !error ? <InfoNote>{notice}</InfoNote> : null}
      {error ? <ErrorBanner message={error} /> : null}

      <CodeEntry
        ref={otpRef}
        code={code}
        onChange={handleCodeChange}
        editable={!isVerifying}
        error={!!error}
        secondsLeft={timer}
        resending={isResending}
        onResend={handleResend}
      />

      <PrimaryButton
        label={isVerifying ? t('verification.verifying') : t('verification.verify')}
        loading={isVerifying}
        onPress={handleVerify}
        disabled={!isComplete || isResending}
      />

      <TextLink
        label={t('verification.wrongEmail')}
        accessibilityLabel={t('verification.useDifferentEmail')}
        onPress={() => router.replace(restartRoute)}
        style={styles.centered}
      />
    </AuthLayout>
  );
}

const useStyles = makeStyles(() => ({
  centered: {
    alignSelf: 'center',
  },
}));
