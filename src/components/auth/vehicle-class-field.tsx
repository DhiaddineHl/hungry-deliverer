import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/text';
import { FieldMessage } from '@/components/ui/text-field';
import { useLocale } from '@/contexts/locale-context';
import { translateFieldError } from '@/features/auth/field-error';
import { REGISTRABLE_VEHICLE_TYPES } from '@/features/auth/schemas';
import type { TranslationKey } from '@/i18n';
import { Icon, makeStyles, type IconName } from '@/theme';

type RegistrableVehicleType = (typeof REGISTRABLE_VEHICLE_TYPES)[number];

/**
 * How each registrable class is presented. Keyed by class, so adding one to
 * REGISTRABLE_VEHICLE_TYPES without a tile here is a type error, not a tile
 * that silently goes missing.
 */
const OPTIONS: Record<RegistrableVehicleType, { label: TranslationKey; icon: IconName }> = {
  MOTORCYCLE: { label: 'application.vehicleMotorcycle', icon: 'vehicleMotorcycle' },
  SCOOTER: { label: 'application.vehicleScooter', icon: 'vehicleScooter' },
  CAR: { label: 'application.vehicleCar', icon: 'vehicleCar' },
};

type Props<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * VehicleTile row (A2): three across. At rest a muted tile with a white well;
 * selected, a white tile with a navy border and a navy well. The chosen class
 * becomes the rider's Vehicle and their VEHICLE_<CLASS> role, so it is required.
 */
export function VehicleClassField<T extends FieldValues>({ control, name, disabled, style }: Props<T>) {
  const { t } = useLocale();
  const styles = useStyles();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange }, fieldState: { error } }) => (
        <View style={[styles.container, disabled && styles.locked, style]}>
          <View style={styles.row} accessibilityRole="radiogroup">
            {REGISTRABLE_VEHICLE_TYPES.map((vehicleType) => {
              const option = OPTIONS[vehicleType];
              const selected = value === vehicleType;
              return (
                <Pressable
                  key={vehicleType}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, disabled }}
                  accessibilityLabel={t(option.label)}
                  disabled={disabled}
                  onPress={() => onChange(vehicleType)}
                  style={[styles.tile, selected && styles.tileSelected, error && !value && styles.tileError]}>
                  <View style={[styles.well, selected && styles.wellSelected]}>
                    <Icon name={option.icon} color={selected ? 'onInk' : 'ink'} />
                  </View>
                  <Text variant="chip">{t(option.label)}</Text>
                </Pressable>
              );
            })}
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
    gap: 10,
  },
  tile: {
    flex: 1,
    height: t.size.vehicleTile,
    borderRadius: t.radius.thumb,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: c.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tileSelected: {
    backgroundColor: c.surface,
    borderColor: c.ink,
  },
  tileError: {
    borderColor: c.danger,
  },
  well: {
    width: t.size.iconWell,
    height: t.size.iconWell,
    borderRadius: t.radius.control,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wellSelected: {
    backgroundColor: c.ink,
  },
}));
