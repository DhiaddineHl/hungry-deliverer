import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

export type OtpInputHandle = {
  /** Puts the caret back in the first box — after a resend, say. */
  focusFirst: () => void;
};

type Props = {
  /** One entry per box; its length is how many boxes are drawn. */
  value: string[];
  onChange: (next: string[]) => void;
  editable?: boolean;
};

/**
 * The row of one-time-code boxes, shared by the two flows that ask for a code:
 * sign-up verification and the forgotten-password reset. They ask for the same
 * thing in the same shape, and the fiddly parts — spreading an autofilled code
 * across the boxes, walking the caret backwards on delete — are worth getting
 * right once.
 *
 * The box count follows `value.length` rather than a prop of its own, because
 * the backend is what decides how many digits it generates and the screens
 * already hold that answer in the array they pass down.
 */
export const OtpInput = forwardRef<OtpInputHandle, Props>(function OtpInput(
  { value, onChange, editable = true },
  ref
) {
  const inputRefs = useRef<(TextInput | null)[]>([]);
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

    // A pasted or autofilled code lands in one box: spread it across the rest
    // rather than keeping a single character and dropping the others.
    const next = [...value];
    for (let i = 0; i < digits.length && index + i < codeLength; i++) {
      next[index + i] = digits[i];
    }
    onChange(next);

    const landed = Math.min(index + digits.length, codeLength - 1);
    inputRefs.current[landed]?.focus();
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.row}>
      {value.map((digit, index) => (
        <TextInput
          key={index}
          ref={(input) => {
            inputRefs.current[index] = input;
          }}
          style={[styles.box, !!digit && styles.boxFilled]}
          value={digit}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
          keyboardType="number-pad"
          // One box, but the OS autofills the whole SMS/email code into the
          // first one — handleChange spreads it from there.
          textContentType={index === 0 ? 'oneTimeCode' : 'none'}
          autoComplete={index === 0 ? 'sms-otp' : 'off'}
          maxLength={codeLength}
          editable={editable}
          selectTextOnFocus
          accessibilityLabel={`Digit ${index + 1} of ${codeLength}`}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  box: {
    flex: 1,
    height: 60,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    fontFamily: Fonts.semibold,
    fontSize: 22,
    textAlign: 'center',
    color: Colors.text,
    padding: 0,
  },
  boxFilled: {
    borderColor: Colors.orange,
  },
});
