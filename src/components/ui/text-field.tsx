import { forwardRef, useState, type ReactNode } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import {
  Pressable,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { Text } from '@/components/ui/text';
import { useLocale } from '@/contexts/locale-context';
import { translateFieldError } from '@/features/auth/field-error';
import { focusGlow, Icon, makeStyles, useTheme, type IconName } from '@/theme';

export type TextFieldProps = Omit<TextInputProps, 'style' | 'editable'> & {
  label?: string;
  /** Already-translated message; turns the field red and is announced. */
  error?: string | null;
  /** Caption under the field ("Optional for scooters under 50 cc."). */
  helper?: string;
  leadingIcon?: IconName;
  /** Replaces the eye toggle / clear button on the right. */
  trailing?: ReactNode;
  /** Locked while a submit is in flight (opacity 0.6). */
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * Label + 52 pt box. At rest it is a muted well with no border; focused it
 * turns white with a 2 pt navy border and a 4 pt orange-soft ring; in error
 * the border is red and the message sits under the field with what to do next.
 */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  {
    label,
    error,
    helper,
    leadingIcon,
    trailing,
    disabled,
    secureTextEntry,
    containerStyle,
    onFocus,
    onBlur,
    ...input
  },
  ref
) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useStyles();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const canToggle = Boolean(secureTextEntry);

  return (
    <View style={[styles.container, disabled && styles.locked, containerStyle]}>
      {label ? <Text variant="label">{label}</Text> : null}
      <View
        style={[
          styles.box,
          focused && styles.boxFocused,
          focused && !error && styles.glow,
          error ? styles.boxError : null,
        ]}>
        {leadingIcon ? <Icon name={leadingIcon} color="inkMuted" /> : null}
        <TextInput
          ref={ref}
          {...input}
          editable={!disabled}
          secureTextEntry={canToggle && hidden}
          placeholderTextColor={colors.inkSubtle}
          cursorColor={colors.primary}
          selectionColor={colors.primary}
          accessibilityLabel={input.accessibilityLabel ?? label}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={styles.input}
        />
        {trailing ??
          (canToggle ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={hidden ? t('common.showPassword') : t('common.hidePassword')}
              onPress={() => setHidden((prev) => !prev)}
              hitSlop={12}>
              <Icon name={hidden ? 'showPassword' : 'hidePassword'} color="inkMuted" />
            </Pressable>
          ) : null)}
      </View>
      {/* A blank error marks the box red with no message of its own — the
          PhoneField puts one message under the whole row instead. */}
      {error?.trim() ? <FieldMessage message={error} /> : helper && !error ? (
        <Text variant="caption" color="inkMuted">
          {helper}
        </Text>
      ) : null}
    </View>
  );
});

/** Red 12/600 message with the alert icon — announced when it appears. */
export function FieldMessage({ message }: { message: string }) {
  const styles = useStyles();
  return (
    <View style={styles.message} accessibilityLiveRegion="polite">
      <Icon name="error" size="inline" color="danger" />
      <Text variant="fieldMessage" color="danger" style={styles.messageText}>
        {message}
      </Text>
    </View>
  );
}

type FormTextFieldProps<T extends FieldValues> = Omit<
  TextFieldProps,
  'value' | 'onChangeText' | 'error'
> & {
  control: Control<T>;
  name: Path<T>;
};

/** A TextField bound to a react-hook-form field; schema messages are catalogue keys. */
export function FormTextField<T extends FieldValues>({
  control,
  name,
  autoCapitalize = 'none',
  ...field
}: FormTextFieldProps<T>) {
  const { t } = useLocale();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
        <TextField
          {...field}
          autoCapitalize={autoCapitalize}
          value={value ?? ''}
          onChangeText={onChange}
          onBlur={onBlur}
          error={error ? translateFieldError(t, error.message) : null}
        />
      )}
    />
  );
}

const useStyles = makeStyles((c, t) => ({
  container: {
    gap: 6,
  },
  locked: {
    opacity: t.opacity.lockedInput,
  },
  box: {
    height: t.size.input,
    borderRadius: t.radius.field,
    backgroundColor: c.surfaceMuted,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  boxFocused: {
    backgroundColor: c.surface,
    borderColor: c.ink,
  },
  glow: {
    boxShadow: focusGlow(c.focusGlow),
  },
  boxError: {
    backgroundColor: c.surface,
    borderColor: c.danger,
  },
  input: {
    flex: 1,
    ...t.typography.input,
    color: c.ink,
    padding: 0,
  },
  message: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  messageText: {
    flex: 1,
  },
}));
