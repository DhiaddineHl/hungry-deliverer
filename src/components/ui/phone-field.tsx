import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { FieldMessage, TextField } from '@/components/ui/text-field';
import { useLocale } from '@/contexts/locale-context';
import { translateFieldError } from '@/features/auth/field-error';
import { Icon, makeStyles } from '@/theme';

/** Fixed until multi-country support lands; prefixed onto the number on submit. */
export const COUNTRY_CODE = '+216';

type Props<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder: string;
  disabled?: boolean;
};

/**
 * Country segment (flag, +216) beside a TextField. The segment is not a picker
 * yet — Tunisia is the only market — so it is drawn as a label, not a button.
 */
export function PhoneField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  disabled,
}: Props<T>) {
  const { t } = useLocale();
  const styles = useStyles();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
        <View style={[styles.container, disabled && styles.locked]}>
          <Text variant="label">{label}</Text>
          <View style={styles.row}>
            <View style={styles.country} accessibilityLabel={t('auth.countryTunisia')}>
              <View style={styles.flag}>
                <View style={styles.flagDot} />
              </View>
              <Text variant="input">{COUNTRY_CODE}</Text>
              <Icon name="chevronDown" size="inline" color="inkMuted" />
            </View>
            <TextField
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={placeholder}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              accessibilityLabel={label}
              disabled={disabled}
              error={error ? ' ' : null}
              containerStyle={styles.number}
            />
          </View>
          {error ? <FieldMessage message={translateFieldError(t, error.message)} /> : null}
        </View>
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
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  country: {
    height: t.size.input,
    borderRadius: t.radius.field,
    backgroundColor: c.surfaceMuted,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // The Tunisian flag, reduced to what reads at 20×14: red field, white disc.
  flag: {
    width: 20,
    height: 14,
    borderRadius: 3,
    backgroundColor: c.flagRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.knob,
  },
  number: {
    flex: 1,
    gap: 0,
  },
}));
