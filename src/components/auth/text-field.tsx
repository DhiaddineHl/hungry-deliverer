import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Control,
  Controller,
  FieldValues,
  Path,
} from 'react-hook-form';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { Text } from '@/components/ui/text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

type Props<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  containerStyle?: ViewStyle;
};

/** A labelled input bound to a react-hook-form field, matching the auth frames. */
export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
  autoComplete,
  textContentType,
  containerStyle,
}: Props<T>) {
  const [hidden, setHidden] = useState(true);
  const canToggle = Boolean(secureTextEntry);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
        <View style={containerStyle}>
          <Text weight="semibold" size={15} style={styles.label}>
            {label}
          </Text>
          <View style={[styles.inputWrap, error && styles.inputWrapError]}>
            <TextInput
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={placeholder}
              placeholderTextColor={Colors.textMuted}
              secureTextEntry={canToggle && hidden}
              keyboardType={keyboardType}
              autoCapitalize={autoCapitalize}
              autoComplete={autoComplete}
              textContentType={textContentType}
              style={styles.input}
            />
            {canToggle ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
                onPress={() => setHidden((prev) => !prev)}
                hitSlop={10}
                style={styles.eye}>
                <Ionicons
                  name={hidden ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={Colors.textMuted}
                />
              </Pressable>
            ) : null}
          </View>
          {error ? (
            <Text size={13} color="#D64545" style={styles.error}>
              {error.message}
            </Text>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: Spacing.two,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.four,
  },
  inputWrapError: {
    borderColor: '#D64545',
  },
  input: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 16,
    color: Colors.text,
    padding: 0,
  },
  eye: {
    paddingLeft: Spacing.two,
  },
  error: {
    marginTop: Spacing.one,
  },
});
