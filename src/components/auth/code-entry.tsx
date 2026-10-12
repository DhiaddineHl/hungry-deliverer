import { forwardRef } from 'react';
import { View } from 'react-native';

import { OtpInput, type OtpInputHandle } from '@/components/auth/otp-input';
import { TextLink } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { useLocale } from '@/contexts/locale-context';
import { formatCountdown } from '@/features/format';
import { makeStyles } from '@/theme';

type Props = {
  code: string[];
  onChange: (next: string[]) => void;
  editable: boolean;
  error: boolean;
  /** Cool-down before another code may be requested; 0 shows the link. */
  secondsLeft: number;
  resending: boolean;
  onResend: () => void;
};

/**
 * Label, the code boxes, and the resend line under them: a countdown
 * (`Resend code in 0:58`) until the backend allows another send, then a link.
 */
export const CodeEntry = forwardRef<OtpInputHandle, Props>(function CodeEntry(
  { code, onChange, editable, error, secondsLeft, resending, onResend },
  ref
) {
  const { t } = useLocale();
  const styles = useStyles();
  return (
    <View style={styles.container}>
      <Text variant="label">{t('verification.codeLabel')}</Text>
      <OtpInput ref={ref} value={code} onChange={onChange} editable={editable} error={error} />
      <View style={styles.resend}>
        {resending ? (
          <Spinner />
        ) : secondsLeft > 0 ? (
          <Text variant="meta" color="inkMuted" tabular>
            {t('verification.resendIn', { time: formatCountdown(secondsLeft) })}
          </Text>
        ) : (
          <TextLink label={t('verification.resend')} onPress={onResend} />
        )}
      </View>
    </View>
  );
});

const useStyles = makeStyles(() => ({
  container: {
    gap: 6,
  },
  resend: {
    alignSelf: 'flex-end',
    minHeight: 20,
    justifyContent: 'center',
    marginTop: 4,
  },
}));
