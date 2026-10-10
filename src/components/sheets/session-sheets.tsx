import { Linking, View } from 'react-native';

import { PrimaryButton, SecondaryButton, TextLink } from '@/components/ui/button';
import { IconWell, StatusDot } from '@/components/ui/content';
import { ErrorBanner } from '@/components/ui/feedback';
import { Text } from '@/components/ui/text';
import { useLocale } from '@/contexts/locale-context';
import { TODAY_SUMMARY } from '@/data/earnings';
import { formatDuration, formatMoney } from '@/features/format';
import type { Vehicle } from '@/services/api/types';
import { makeStyles, type IconName } from '@/theme';
import type { TranslationKey } from '@/i18n';

const VEHICLE_LABELS: Partial<Record<NonNullable<Vehicle['type']>, TranslationKey>> = {
  MOTORCYCLE: 'application.vehicleMotorcycle',
  SCOOTER: 'application.vehicleScooter',
  CAR: 'application.vehicleCar',
};

export function vehicleIcon(type: Vehicle['type'] | undefined): IconName {
  if (type === 'CAR' || type === 'VAN' || type === 'TRUCK') return 'vehicleCar';
  if (type === 'SCOOTER') return 'vehicleScooter';
  return 'vehicleMotorcycle';
}

/** "Scooter · 123 TUN 4567" — the vehicle on the rider's record. */
export function useVehicleLabel(vehicle: Vehicle | null | undefined): string | null {
  const { t } = useLocale();
  if (!vehicle?.type) return null;
  const key = VEHICLE_LABELS[vehicle.type];
  const name = key ? t(key) : vehicle.type.charAt(0) + vehicle.type.slice(1).toLowerCase();
  return vehicle.licensePlate ? `${name} · ${vehicle.licensePlate}` : name;
}

/**
 * D1 — offline: what going online means, the vehicle in use, Go online.
 *
 * Going online needs a real GPS fix — dispatch matches offers against the
 * position sent — so without location permission the sheet asks for it, and
 * until the first fix the button waits.
 */
export function OfflineSheet({
  vehicle,
  locationGranted,
  canGoOnline,
  failed,
  onGoOnline,
  onChangeVehicle,
}: {
  vehicle: Vehicle | null | undefined;
  locationGranted: boolean;
  canGoOnline: boolean;
  failed: boolean;
  onGoOnline: () => void;
  onChangeVehicle: () => void;
}) {
  const { t } = useLocale();
  const styles = useStyles();
  const vehicleLabel = useVehicleLabel(vehicle);

  if (!locationGranted) {
    return (
      <>
        <View style={styles.titleBlock}>
          <View style={styles.titleRow}>
            <IconWell icon="pinOff" tone="danger" />
            <Text variant="heading" accessibilityRole="header" style={styles.flex}>
              {t('delivery.locationNeededTitle')}
            </Text>
          </View>
          <Text variant="description" color="inkMuted">
            {t('delivery.locationNeededBody')}
          </Text>
        </View>
        <PrimaryButton label={t('delivery.openSettings')} icon="settings" onPress={() => Linking.openSettings()} />
      </>
    );
  }

  return (
    <>
      <View style={styles.titleBlock}>
        <Text variant="heading" accessibilityRole="header">
          {t('delivery.offlineTitle')}
        </Text>
        <Text variant="description" color="inkMuted">
          {t('delivery.offlineBody')}
        </Text>
      </View>

      <View style={styles.row}>
        <IconWell icon={vehicleIcon(vehicle?.type)} />
        <View style={styles.flex}>
          <Text variant="caption" color="inkMuted" style={styles.regular}>
            {t('delivery.deliveringWith')}
          </Text>
          <Text variant="itemLabel" numberOfLines={1}>
            {vehicleLabel ?? t('delivery.vehicleUnknown')}
          </Text>
        </View>
        <TextLink label={t('auth.change')} onPress={onChangeVehicle} />
      </View>

      {failed ? <ErrorBanner message={t('delivery.goOnlineFailed')} /> : null}

      <PrimaryButton
        label={canGoOnline ? (failed ? t('common.retry') : t('delivery.goOnline')) : t('delivery.locating')}
        icon={canGoOnline ? 'power' : undefined}
        disabled={!canGoOnline}
        onPress={onGoOnline}
      />
    </>
  );
}

/**
 * D2 — online, looking for orders: how long the session has run and today's
 * tally, where demand is, and Go offline. There is no busy-area feed yet, so
 * the card shows its empty state rather than invented zones.
 */
export function FindingSheet({ onlineMinutes, onGoOffline }: { onlineMinutes: number; onGoOffline: () => void }) {
  const { t } = useLocale();
  const styles = useStyles();
  const trips =
    TODAY_SUMMARY.trips === 1 ? t('common.tripsOne') : t('common.tripsOther', { count: TODAY_SUMMARY.trips });
  return (
    <>
      <View style={styles.summary}>
        <View style={styles.online}>
          <StatusDot color="success" />
          <Text variant="itemTitle" tabular>
            {t('delivery.onlineFor', { duration: formatDuration(onlineMinutes) })}
          </Text>
        </View>
        <Text variant="meta" color="inkMuted" tabular style={styles.regular}>
          {t('delivery.todaySummary', { trips, amount: formatMoney(TODAY_SUMMARY.earned.amount) })}
        </Text>
      </View>

      <View style={[styles.row, styles.busyRow]}>
        <IconWell icon="busyZone" tone="primary" size={44} iconSize="field" />
        <View style={styles.flex}>
          <Text variant="itemTitle">{t('delivery.noBusyAreas')}</Text>
          <Text variant="meta" color="inkMuted" style={styles.regular}>
            {t('delivery.noBusyAreasBody')}
          </Text>
        </View>
      </View>

      <SecondaryButton label={t('delivery.goOffline')} icon="power" onPress={onGoOffline} />
    </>
  );
}

const useStyles = makeStyles((c, t) => ({
  flex: {
    flex: 1,
    gap: 2,
  },
  regular: {
    fontFamily: t.typography.description.fontFamily,
  },
  titleBlock: {
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: c.divider,
    borderRadius: t.radius.thumb,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  busyRow: {
    gap: 14,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  online: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
}));
