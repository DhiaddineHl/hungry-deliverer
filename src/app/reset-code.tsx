import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { OtpInput, type OtpInputHandle } from '@/components/auth/otp-input';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Text } from '@/components/ui/text';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
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
  const insets = useSafeAreaInsets();
  const email = usePasswordResetStore((state) => state.email);
  const setTicket = usePasswordResetStore((state) => state.setTicket);

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
          : 'The server has no mail transport configured — the code is in its logs.'
      );
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
  }, [email, timer, isResending]);

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
      setError(err instanceof Error ? err.message : 'Could not verify the code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // The store was cleared (an app restart mid-flow), so there is no address to
  // check a code against and nothing was ever sent.
  if (!email) {
    return (
      <View style={styles.screen}>
        <StatusBar style="light" />
        <AuthBackdrop />
        <View style={styles.cardWrap}>
          <View style={styles.emptyState}>
            <Text weight="bold" size={22} style={styles.centered}>
              Nothing to reset
            </Text>
            <Text size={15} color={Colors.textSecondary} style={styles.emptyBody}>
              We do not know which account to reset. Start again and we will email you a new code.
            </Text>
            <PrimaryButton
              label="START AGAIN"
              onPress={() => router.replace('/forgot-password')}
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
                Reset password
              </Text>
              <Text size={15} color={Colors.textSecondary} style={styles.subtitle}>
                We sent a code to
              </Text>
              <Text weight="semibold" size={15} style={styles.headingEmail}>
                {email}
              </Text>
            </View>

            <Text weight="semibold" size={15} style={styles.codeLabel}>
              Code
            </Text>

            <OtpInput
              ref={otpRef}
              value={code}
              onChange={handleCodeChange}
              editable={!isVerifying}
            />

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
                  accessibilityLabel="Resend the reset code"
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

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Use a different email"
              onPress={() => router.replace('/forgot-password')}
              hitSlop={8}>
              <Text size={14} color={Colors.textSecondary} style={styles.changeEmail}>
                Wrong email? Start again
              </Text>
            </Pressable>
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
    // Matches the sign-up verification card — same boxes, same copy depth.
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
