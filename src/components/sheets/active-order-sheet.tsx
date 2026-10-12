import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { PrimaryButton, TextLink } from '@/components/ui/button';
import { ErrorBanner, SuccessLine } from '@/components/ui/feedback';
import { SlideToConfirm } from '@/components/ui/slide-to-confirm';
import { Text } from '@/components/ui/text';
import { CashToCollect, ContactBlock, OrderSummary, StepHeader } from '@/components/sheets/trip-parts';
import { useLocale } from '@/contexts/locale-context';
import {
  ARRIVAL_RADIUS_METERS,
  DELIVERY_RADIUS_METERS,
  type StatusReport,
} from '@/features/session/session-context';
import type { Order, SessionPhase } from '@/features/session/types';
import { Icon, makeStyles } from '@/theme';

export type TripPhase = Extract<SessionPhase, 'toStore' | 'orderReady' | 'toCustomer'>;

type Props = {
  order: Order;
  phase: TripPhase;
  expanded: boolean;
  onToggle: () => void;
  /** Within delivery range of the customer — unlocks the slider (D7 → D8). */
  nearCustomer: boolean;
  onConfirmPickup: () => void;
  onConfirmDelivery: () => void;
  onShowOrderNumber: () => void;
  /** A pickup / delivery report waiting on the backend. */
  reportPending: StatusReport | null;
  /** The last report the backend refused — shown above the action. */
  reportFailed: StatusReport | null;
};

/**
 * The in-trip sheet content, D4–D8. Mounted keyed by order, so the bag
 * checklist starts empty for every new order.
 *
 *   toStore    D4 pickup (D5 when collapsed)
 *   orderReady D6 at the store, checking the bag
 *   toCustomer D7 on the way (slider locked) / D8 arrived (slider ready)
 */
export function ActiveOrderSheet({
  order,
  phase,
  expanded,
  onToggle,
  nearCustomer,
  onConfirmPickup,
  onConfirmDelivery,
  onShowOrderNumber,
  reportPending,
  reportFailed,
}: Props) {
  const { t } = useLocale();
  const styles = useStyles();
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());
  // D7 shows the order collapsed, D8 opens it so the rider can hand it over.
  const [itemsOpen, setItemsOpen] = useState<boolean | null>(null);

  const pickup = phase !== 'toCustomer';
  const status = pickup
    ? phase === 'toStore'
      ? t('delivery.minutesLeft', { count: order.minutesToPickup })
      : t('delivery.atTheStore')
    : nearCustomer
      ? t('delivery.atDropoff')
      : t('delivery.minutesAway', { count: order.etaToCustomerMinutes });

  if (!expanded) {
    // D5 — one summary row; the whole row expands the sheet.
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('delivery.expandSheet')}
        onPress={onToggle}
        style={styles.collapsed}>
        <View style={styles.flex}>
          <Text variant="label" color="inkMuted">
            {pickup
              ? t('delivery.collapsedPickup', { status })
              : t('delivery.collapsedDropoff', { status })}
          </Text>
          <Text variant="rowTitle" numberOfLines={1}>
            {pickup ? order.store.name : order.customer.name}
          </Text>
        </View>
        <Icon name="chevronUp" size="row" />
      </Pressable>
    );
  }

  const toggleItem = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allChecked = order.items.every((item) => checked.has(item.id));

  return (
    <Animated.View entering={FadeIn.duration(180)} style={styles.content}>
      <StepHeader step={pickup ? 1 : 2} status={status} />

      {phase === 'orderReady' ? <SuccessLine>{t('delivery.atStoreLine')}</SuccessLine> : null}

      {pickup ? (
        <ContactBlock kind="store" name={order.store.name} address={order.store.address} phone={order.store.phone} />
      ) : (
        <ContactBlock
          kind="customer"
          name={order.customer.name}
          address={order.customer.address}
          phone={order.customer.phone}
        />
      )}

      {!pickup && order.paymentMethod === 'cash' ? <CashToCollect amount={order.totalTnd} /> : null}

      {phase === 'toStore' ? (
        <>
          <OrderSummary reference={order.reference} items={order.items} expanded />
          <View style={styles.action}>
            {/* Arrival is detected from GPS; the button carries the rule until it is. */}
            <PrimaryButton label={t('delivery.arrivedAtStore')} onPress={() => {}} disabled />
            <Text variant="caption" color="inkMuted" align="center" style={styles.regular}>
              {t('delivery.arrivalHelper', { meters: ARRIVAL_RADIUS_METERS })}
            </Text>
          </View>
        </>
      ) : null}

      {phase === 'orderReady' ? (
        <>
          <View style={styles.checklist}>
            <View style={styles.checklistHeader}>
              <Text variant="label">{t('delivery.checkBag')}</Text>
              <TextLink label={t('delivery.showCode')} onPress={onShowOrderNumber} />
            </View>
            <OrderSummary
              reference={order.reference}
              items={order.items}
              expanded
              checked={checked}
              onToggleItem={toggleItem}
            />
          </View>
          {reportFailed === 'pickup' ? <ErrorBanner message={t('delivery.pickupFailed')} /> : null}
          <PrimaryButton
            label={
              allChecked
                ? reportFailed === 'pickup'
                  ? t('common.retry')
                  : t('delivery.confirmPickup')
                : t('delivery.confirmPickupProgress', { checked: checked.size, total: order.items.length })
            }
            disabled={!allChecked}
            loading={reportPending === 'pickup'}
            onPress={onConfirmPickup}
          />
        </>
      ) : null}

      {phase === 'toCustomer' ? (
        <>
          <OrderSummary
            reference={order.reference}
            items={order.items}
            expanded={itemsOpen ?? nearCustomer}
            onToggle={() => setItemsOpen(!(itemsOpen ?? nearCustomer))}
          />
          {reportFailed === 'delivery' ? <ErrorBanner message={t('delivery.deliveryFailed')} /> : null}
          <SlideToConfirm
            confirming={reportPending === 'delivery'}
            label={t('delivery.slideToConfirm')}
            confirmingLabel={t('delivery.confirming')}
            locked={!nearCustomer}
            lockedHelper={t('delivery.confirmHelper', { meters: DELIVERY_RADIUS_METERS })}
            onConfirm={onConfirmDelivery}
          />
        </>
      ) : null}
    </Animated.View>
  );
}

const useStyles = makeStyles((c, t) => ({
  flex: {
    flex: 1,
  },
  regular: {
    fontFamily: t.typography.description.fontFamily,
  },
  collapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: t.size.minTouch,
  },
  content: {
    gap: 14,
  },
  action: {
    gap: 6,
  },
  checklist: {
    gap: 6,
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
}));
