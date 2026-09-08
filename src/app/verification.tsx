import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthBackdrop } from '@/components/auth/auth-backdrop';
import { TermsFooter } from '@/components/auth/auth-common';
import { OtpInput, type OtpInputHandle } from '@/components/auth/otp-input';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Text } from '@/components/ui/text';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
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
  const params = useLocalSearchParams<{ email?: string }>();
  const insets = useSafeAreaInsets();
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
          : 'The server has no mail transport configured — the code is in its logs.'
      );
    },
    []
  );

  const requestCode = useCallback(
    async (address: string) => {
      setError(null);
      setIsResending(true);
      try {
        const challenge = await sendVerificationCode(address);
        if (challenge.alreadyVerified) {
          setNotice('This email is already verified. You can sign in.');
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
        setError(err instanceof Error ? err.message : 'Could not send the code. Please try again.');
      } finally {
        setIsResending(false);
      }
    },
    [applyChallenge]
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
          setError(
            `${result.error ?? 'Sign-in failed'} — your email is verified, please log in to continue.`
          );
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
      setError(err instanceof Error ? err.message : 'Could not verify the code. Please try again.');
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
      pending.firstName ? `Almost there, ${pending.firstName}!` : 'We sent a code to your email',
    [pending.firstName]
  );

  // Nothing to verify — the store was cleared (app restart mid-flow) and no
  // session or param supplied an address.
  if (!email) {
    return (
      <View style={styles.screen}>
        <StatusBar style="light" />
        <AuthBackdrop />
        <View style={styles.cardWrap}>
          <View style={styles.emptyState}>
            <Text weight="bold" size={22} style={styles.centered}>
              Nothing to verify
            </Text>
            <Text size={15} color={Colors.textSecondary} style={styles.emptyBody}>
              We do not know which email to confirm. Sign in and we will pick the verification back
              up.
            </Text>
            <PrimaryButton
              label="GO TO LOGIN"
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
                Verification
              </Text>
              <Text size={15} color={Colors.textSecondary} style={styles.subtitle}>
                {greeting}
              </Text>
              <Text weight="semibold" size={15} style={styles.headingEmail}>
                {email}
              </Text>
            </View>

            <Text weight="semibold" size={15} style={styles.codeLabel}>
              Code
            </Text>

            <OtpInput ref={otpRef} value={code} onChange={handleCodeChange} editable={!isVerifying} />

            {error ? (
              <View style={styles.errorBanner}>
                <Text size={14} color="#B3261E">
                  {error}
                </Text>
              </View>
            ) : null}

            {notice && !error ? (
              <View style={styles.noticeBanner}>
                <Text size={14} color={Colors.navy}>
                  {notice}
                </Text>
              </View>
            ) : null}

            <View style={styles.resendRow}>
              {isResending ? (
                <ActivityIndicator size="small" color={Colors.orange} />
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Resend the verification code"
                  onPress={handleResend}
                  disabled={timer > 0}
                  hitSlop={8}>
                  <Text size={14} color={timer > 0 ? Colors.textMuted : Colors.orange}>
                    {timer > 0 ? `Resend in ${timer}s` : 'Resend'}
                  </Text>
                </Pressable>
              )}
            </View>

            <PrimaryButton
              label={isVerifying ? 'VERIFYING…' : 'VERIFY'}
              onPress={handleVerify}
              disabled={!isComplete || isVerifying || isResending}
              style={styles.submit}
            />

            {/* Only meaningful before a session exists: once signed in, the
                address is the account and cannot be swapped from here. */}
            {!isAuthenticated ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Use a different email"
                onPress={handleChangeEmail}
                hitSlop={8}>
                <Text size={14} color={Colors.textSecondary} style={styles.changeEmail}>
                  Wrong email? Start again
                </Text>
              </Pressable>
            ) : null}

            <TermsFooter />
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
    // A definite height (not maxHeight): an auto-height absolute card leaves the
    // ScrollView unbounded, so it sizes to its content and clips instead of
    // scrolling. Same note as the login and sign-up screens.
    height: '72%',
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
  headingEmail: {
    marginTop: Spacing.one,
  },
  codeLabel: {
    marginBottom: Spacing.two,
  },
  errorBanner: {
    padding: Spacing.three,
    marginBottom: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: '#FDECEA',
  },
  noticeBanner: {
    padding: Spacing.three,
    marginBottom: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: Colors.orangeSoft,
  },
  resendRow: {
    alignSelf: 'flex-end',
    minHeight: 20,
    justifyContent: 'center',
    marginBottom: Spacing.five,
  },
  submit: {
    marginBottom: Spacing.four,
  },
  changeEmail: {
    textAlign: 'center',
    textDecorationLine: 'underline',
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
});
