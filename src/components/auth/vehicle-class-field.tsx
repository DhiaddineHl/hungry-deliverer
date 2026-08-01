import { Ionicons } from '@expo/vector-icons';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { VEHICLE_TYPES, type VehicleType } from '@/services/api/types';

type Option = {
  value: VehicleType;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
};

/** Kept in the backend enum's order so the grid reads from lightest to heaviest. */
const OPTIONS: Option[] = [
  { value: 'BICYCLE', label: 'Bicycle', icon: 'bicycle-outline' },
  { value: 'MOTORCYCLE', label: 'Motorcycle', icon: 'speedometer-outline' },
  { value: 'SCOOTER', label: 'Scooter', icon: 'flash-outline' },
  { value: 'CAR', label: 'Car', icon: 'car-outline' },
  { value: 'VAN', label: 'Van', icon: 'bus-outline' },
  { value: 'TRUCK', label: 'Truck', icon: 'cube-outline' },
];

// A missing option would silently drop a class the backend accepts.
if (OPTIONS.length !== VEHICLE_TYPES.length) {
  console.warn('[VehicleClassField] options are out of sync with VEHICLE_TYPES');
}

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
 */
export function VehicleClassField<T extends FieldValues>({
  control,
  name,
  label = 'How do you deliver?',
  containerStyle,
}: Props<T>) {
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
            {OPTIONS.map((option) => {
              const selected = value === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={option.label}
                  onPress={() => onChange(option.value)}
                  style={[styles.tile, selected && styles.tileSelected]}>
                  <Ionicons
                    name={option.icon}
                    size={22}
                    color={selected ? Colors.orange : Colors.textSecondary}
                  />
                  <Text
                    weight={selected ? 'semibold' : 'regular'}
                    size={13}
                    color={selected ? Colors.text : Colors.textSecondary}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
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
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  tileSelected: {
    borderColor: Colors.orange,
    backgroundColor: Colors.orangeSoft,
  },
  error: {
    marginTop: Spacing.one,
  },
});
