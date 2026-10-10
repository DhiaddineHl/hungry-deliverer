import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AuthHeading } from '@/components/auth/auth-common';
import { AuthLayout } from '@/components/auth/auth-layout';
import { CodeEntry } from '@/components/auth/code-entry';
import { type OtpInputHandle } from '@/components/auth/otp-input';
import { PrimaryButton, TextLink } from '@/components/ui/button';
import { ErrorBanner, InfoNote, StateView } from '@/components/ui/feedback';
import { useLocale } from '@/contexts/locale-context';
import { useAuth } from '@/contexts/auth-context';
import { makeStyles } from '@/theme';
import { isApiError } from '@/services/api/client';
import { confirmVerificationCode, sendVerificationCode } from '@/services/api/driver-service';
import { usePendingVerificationStore } from '@/store/pending-verification-store';

/**
 * Boxes drawn before the backend has said otherwise. Must match
 * `hungry.driver.verification.code-length` (default 6) in the backend
 * properties; a send answers with the authoritative `codeLength`, which
 * replaces this.
 */
const DEFAULT_CODE_LENGTH = 6;

/**
 * Seconds the Resend button stays asleep after a code goes out. Mirrors
 * `hungry.driver.verification.resend-cooldown-seconds`; the backend is the one
 * that enforces it, this only keeps the button from being pressed into a
 * guaranteed 429.
 */
const DEFAULT_RESEND_COOLDOWN = 60;

export default function VerificationScreen() {
  const { t } = useLocale();
  const styles = useStyles();
  const params = useLocalSearchParams<{ email?: string }>();
  const { user, isAuthenticated, login, reloadUser } = useAuth();
  const pending = usePendingVerificationStore();
  const clearPending = pending.clear;

  /**
   * Two ways in, one screen:
   *  - straight from sign-up, where the store holds the address and the
   *    password the confirmation will sign in with;
   *  - from a session that is authenticated but unverified (an account that
   *    abandoned this step earlier and logged back in), where the address
   *    comes from the token.
   *
   * Neither arrives with a code in flight: `POST /drivers` creates the account
   * and nothing else — the only thing on the backend that mails a code is
   * `POST /drivers/verification/send`. So this screen always asks for the
   * first one itself, whichever way it was reached.
   */
  const derivedEmail = pending.email ?? params.email ?? user?.email ?? null;

  // Held in state rather than read straight from the store: clearing the
  // pending registration (which happens the moment a code is accepted) would
  // otherwise pull the address out from under a screen that is still on
  // display — and the screen has nothing to say without one.
  const [email, setEmail] = useState(derivedEmail);
  if (derivedEmail && derivedEmail !== email) {
    // Adjusting own state during render, the pattern React documents for
    // "derived from props, but sticky": it re-renders immediately with the new
    // value and never commits the intermediate one, unlike an effect.
    setEmail(derivedEmail);
  }

  const [codeLength, setCodeLength] = useState(DEFAULT_CODE_LENGTH);
  const [code, setCode] = useState<string[]>(() => Array(DEFAULT_CODE_LENGTH).fill(''));
  // Zero, not the cool-down: nothing has been sent yet at mount. The send
  // below replaces it with the interval the backend reports.
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const otpRef = useRef<OtpInputHandle>(null);
  const fullCode = code.join('');
  const isComplete = fullCode.length === codeLength;

  const applyChallenge = useCallback(
    (challenge: { codeLength: number; resendAvailableInSeconds: number; delivered: boolean }) => {
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
    },
    [t]
  );

  const requestCode = useCallback(
    async (address: string) => {
      setError(null);
      setIsResending(true);
      try {
        const challenge = await sendVerificationCode(address);
        if (challenge.alreadyVerified) {
          setNotice(t('verification.alreadyVerified'));
          setTimer(0);
          return;
        }
        applyChallenge(challenge);
        otpRef.current?.focusFirst();
      } catch (err) {
        // 429 is the cool-down, and it tells us exactly how long is left —
        // adopt that instead of guessing, so the button and the server agree.
        if (isApiError(err, 429)) {
          const retryAfter = err.data?.retryAfterSeconds;
          if (typeof retryAfter === 'number') setTimer(Math.ceil(retryAfter));
        }
        setError(err instanceof Error ? err.message : t('verification.errorSend'));
      } finally {
        setIsResending(false);
      }
    },
    [applyChallenge, t]
  );

  // The first code, sent once per visit as soon as an address is known. The
  // ref — not a piece of state — is what makes it once: clearing the pending
  // registration after a successful confirmation re-renders this screen while
  // it is still on display, and a state-derived guard would read that as a
  // fresh arrival and fire off a pointless new code on the way out.
  const autoSent = useRef(false);
  useEffect(() => {
    if (!email || autoSent.current) return;
    autoSent.current = true;
    requestCode(email);
  }, [email, requestCode]);

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleCodeChange = (next: string[]) => {
    setCode(next);
    setError(null);
  };

  const handleResend = () => {
    if (timer > 0 || isResending || !email) return;
    requestCode(email);
  };

  const handleVerify = async () => {
    if (!email || !isComplete || isVerifying) return;
    setError(null);
    setNotice(null);
    setIsVerifying(true);
    try {
      await confirmVerificationCode(email, fullCode);

      // Verified — but the app still needs a session. Signing in only happens
      // on the sign-up path; an already-authenticated deliverer just needs
      // their userinfo re-read so `email_verified` stops sending them back
      // here. Either way the root navigator decides where they land.
      if (pending.password) {
        const result = await login(email, pending.password);
        if (!result.success) {
          // The address is confirmed and the credentials are gone from memory
          // the moment we leave; the honest move is to send them to the login
          // screen rather than pretend the flow can continue.
          clearPending();
          setError(`${result.error ?? t('verification.errorSignIn')}. ${t('verification.verifiedLogIn')}`);
          return;
        }
        clearPending();
        router.replace('/delivery');
        return;
      }

      await reloadUser({ email_verified: true });
      clearPending();
      router.replace('/delivery');
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

  const handleChangeEmail = () => {
    clearPending();
    // Back to identification, not straight to sign-up: a different address may
    // well already have an account, and that screen is what decides.
    router.replace('/');
  };

  const greeting = useMemo(
    () =>
      pending.firstName ? t('verification.greeting', { name: pending.firstName }) : t('verification.sentCode'),
    [pending.firstName, t]
  );

  // Nothing to verify — the store was cleared (app restart mid-flow) and no
  // session or param supplied an address.
  if (!email) {
    return (
      <AuthLayout>
        <StateView icon="mail" title={t('verification.nothingToVerify')} body={t('verification.nothingToVerifyBody')}>
          <PrimaryButton label={t('verification.goToLogin')} onPress={() => router.replace('/')} />
        </StateView>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthHeading title={t('verification.title')} subtitle={`${greeting} ${email}`} />

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

      {/* Only meaningful before a session exists: once signed in, the address
          is the account and cannot be swapped from here. */}
      {!isAuthenticated ? (
        <TextLink
          label={t('verification.wrongEmail')}
          accessibilityLabel={t('verification.useDifferentEmail')}
          onPress={handleChangeEmail}
          style={styles.centered}
        />
      ) : null}
    </AuthLayout>
  );
}

const useStyles = makeStyles(() => ({
  centered: {
    alignSelf: 'center',
  },
}));
