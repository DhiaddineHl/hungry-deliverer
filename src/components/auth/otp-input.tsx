import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';

import { focusGlow, makeStyles, useTheme } from '@/theme';

export type OtpInputHandle = {
  /** Puts the caret back in the first box — after a resend, say. */
  focusFirst: () => void;
};

type Props = {
  /** One entry per box; its length is how many boxes are drawn. */
  value: string[];
  onChange: (next: string[]) => void;
  editable?: boolean;
  /** A wrong or expired code: every box turns red. */
  error?: boolean;
};

/**
 * The row of one-time-code boxes, shared by sign-up verification and the
 * password reset. The fiddly parts — spreading an autofilled code across the
 * boxes, walking the caret backwards on delete — are worth getting right once.
 *
 * The box count follows `value.length`: the backend decides how many digits it
 * generates, and the screens already hold that answer in the array.
 */
export const OtpInput = forwardRef<OtpInputHandle, Props>(function OtpInput(
  { value, onChange, editable = true, error = false },
  ref
) {
  const { colors } = useTheme();
  const styles = useStyles();
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [focused, setFocused] = useState<number | null>(null);
  const codeLength = value.length;

  useImperativeHandle(ref, () => ({
    focusFirst: () => inputRefs.current[0]?.focus(),
  }));

  const handleChange = (text: string, index: number) => {
    const digits = text.replace(/\D/g, '');
    if (!digits) {
      onChange(value.map((digit, i) => (i === index ? '' : digit)));
      return;
    }
    // A pasted or autofilled code lands in one box: spread it across the rest.
    const next = [...value];
    for (let i = 0; i < digits.length && index + i < codeLength; i++) {
      next[index + i] = digits[i];
    }
    onChange(next);
    inputRefs.current[Math.min(index + digits.length, codeLength - 1)]?.focus();
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={[styles.row, !editable && styles.locked]}>
      {value.map((digit, index) => {
        const isFocused = focused === index && !error;
        return (
          <TextInput
            key={index}
            ref={(input) => {
              inputRefs.current[index] = input;
            }}
            style={[styles.box, isFocused && styles.boxFocused, error && styles.boxError]}
            value={digit}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
            onFocus={() => setFocused(index)}
            onBlur={() => setFocused((current) => (current === index ? null : current))}
            keyboardType="number-pad"
            // The OS autofills the whole code into the first box; handleChange spreads it.
            textContentType={index === 0 ? 'oneTimeCode' : 'none'}
            autoComplete={index === 0 ? 'sms-otp' : 'off'}
            maxLength={codeLength}
            editable={editable}
            selectTextOnFocus
            cursorColor={colors.primary}
            selectionColor={colors.primary}
            accessibilityLabel={`Digit ${index + 1} of ${codeLength}`}
          />
        );
      })}
    </View>
  );
});

const useStyles = makeStyles((c, t) => ({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  locked: {
    opacity: t.opacity.lockedInput,
  },
  box: {
    flex: 1,
    height: t.size.otpBox,
    borderRadius: t.radius.field,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: c.surfaceMuted,
    ...t.typography.otpDigit,
    color: c.ink,
    textAlign: 'center',
    padding: 0,
  },
  boxFocused: {
    backgroundColor: c.surface,
    borderColor: c.ink,
    boxShadow: focusGlow(c.focusGlow),
  },
  boxError: {
    backgroundColor: c.surface,
    borderColor: c.danger,
  },
}));
