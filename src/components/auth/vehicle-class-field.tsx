import { Ionicons } from '@expo/vector-icons';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Pressable, View, type ViewStyle } from 'react-native';

import { translateFieldError } from '@/features/auth/field-error';
import { useLocale } from '@/contexts/locale-context';
import { makeStyles } from '@/hooks/use-themed-styles';
import { useColors } from '@/contexts/theme-context';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { REGISTRABLE_VEHICLE_TYPES } from '@/features/auth/schemas';

type RegistrableVehicleType = (typeof REGISTRABLE_VEHICLE_TYPES)[number];

type Option = {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
};

/**
 * How each registrable class is presented. Keyed by the class rather than
 * listed, so the record is exhaustive by construction: adding a class to
 * REGISTRABLE_VEHICLE_TYPES without a tile here is a type error, not a tile
 * that silently goes missing at runtime.
 */
const OPTIONS: Record<RegistrableVehicleType, Option> = {
  MOTORCYCLE: { label: 'Motorcycle', icon: 'speedometer-outline' },
  SCOOTER: { label: 'Scooter', icon: 'flash-outline' },
  CAR: { label: 'Car', icon: 'car-outline' },
};

type Props<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  containerStyle?: ViewStyle;
};

/**
 * Vehicle class picker for the sign-up form. The chosen class is what the
 * backend uses to create the deliverer's vehicle and to grant the matching
 * VEHICLE_<CLASS> realm role, so it is a required registration field.
 *
 * It offers the classes in `REGISTRABLE_VEHICLE_TYPES` — a subset of what the
 * backend accepts. The sign-up schema enforces the same list, so a class that
 * is not shown here cannot be submitted either.
 */
export function VehicleClassField<T extends FieldValues>({
  control,
  name,
  label = 'How do you deliver?',
  containerStyle,
}: Props<T>) {
  const { t } = useLocale();
  const colors = useColors();
  const styles = useStyles();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange }, fieldState: { error } }) => (
        <View style={containerStyle}>
          <Text weight="semibold" size={15} style={styles.label}>
            {label}
          </Text>
          <View style={styles.grid}>
            {REGISTRABLE_VEHICLE_TYPES.map((vehicleType) => {
              const option = OPTIONS[vehicleType];
              const selected = value === vehicleType;
              return (
                <Pressable
                  key={vehicleType}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={option.label}
                  onPress={() => onChange(vehicleType)}
                  style={[styles.tile, selected && styles.tileSelected]}>
                  <Ionicons
                    name={option.icon}
                    size={22}
                    color={selected ? colors.orange : colors.textSecondary}
                  />
                  <Text
                    weight={selected ? 'semibold' : 'regular'}
                    size={13}
                    color={selected ? colors.text : colors.textSecondary}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {error ? (
            <Text size={13} color={colors.danger} style={styles.error}>
              {translateFieldError(t, error.message)}
            </Text>
          ) : null}
        </View>
      )}
    />
  );
}

const useStyles = makeStyles((c) => ({
  label: {
    marginBottom: Spacing.two,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  tile: {
    // Three per row, accounting for the two gaps between them.
    flexBasis: '30%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
  },
  tileSelected: {
    borderColor: c.orange,
    backgroundColor: c.orangeSoft,
  },
  error: {
    marginTop: Spacing.one,
  },
}));
