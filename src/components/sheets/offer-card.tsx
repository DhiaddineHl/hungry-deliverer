import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { PrimaryButton, SecondaryButton } from '@/components/ui/button';
import { Badge, Divider } from '@/components/ui/content';
import { Text } from '@/components/ui/text';
import { StopRow } from '@/components/sheets/trip-parts';
import { useLocale } from '@/contexts/locale-context';
import { formatCountdown, formatKm, formatMoney } from '@/features/format';
import type { Order } from '@/features/session/types';
import { Icon, makeStyles } from '@/theme';

type Props = {
  order: Order;
  /** An accept is in flight — Accept shows a spinner until the backend answers. */
  accepting: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

/** Whole seconds left before `deadline`, ticking once a second. */
function useSecondsLeft(deadline: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

/**
 * D3 — the offer on the table. The countdown runs against the deadline the
 * backend stamped on the offer (`order.expiresAt`), so a re-render never
 * restarts it; the session auto-declines when it reaches zero.
 *
 * The headline figure is what the rider earns. The offer feed does not carry
 * that yet, so until it does the card shows the order total — labelled as the
 * order total, never passed off as earnings.
 */
export function OfferCard({ order, accepting, onAccept, onDecline }: Props) {
  const { t } = useLocale();
  const styles = useStyles();
  const secondsLeft = useSecondsLeft(order.expiresAt);

  // The bar starts from the fraction already gone (the offer may have waited
  // in a push) and drains linearly to the deadline on the UI thread.
  const progress = useSharedValue(1);
  useEffect(() => {
    const remaining = Math.max(0, order.expiresAt - Date.now());
    progress.set(Math.min(1, remaining / order.countdownMs));
    progress.set(withTiming(0, { duration: remaining, easing: Easing.linear }));
  }, [order.expiresAt, order.countdownMs, progress]);
  const barStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.get() }] }));

  const earns = order.riderEarningsTnd;
  const paymentLine =
    order.paymentMethod === 'cash'
      ? t('delivery.cashOrder', { amount: formatMoney(order.totalTnd) })
      : order.paymentMethod === 'online'
        ? t('delivery.paidOnline')
        : order.items.length === 1
          ? t('common.itemsOne')
          : t('common.itemsOther', { count: order.items.length });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Badge label={t('delivery.newOrder')} />
        <View
          style={styles.countdown}
          accessibilityLabel={t('delivery.secondsLeft', { seconds: secondsLeft })}>
          <Icon name="countdown" size="small" />
          <Text variant="metaStrong">{formatCountdown(secondsLeft)}</Text>
        </View>
      </View>

      <View style={styles.track} accessibilityElementsHidden>
        <Animated.View style={[styles.fill, barStyle]} />
      </View>

      <View style={styles.earnings}>
        <View style={styles.flex}>
          <Text variant="caption" color="inkMuted" style={styles.regular}>
            {earns !== null ? t('delivery.youEarn') : t('delivery.orderTotal')}
          </Text>
          <Text variant="offerAmount" adjustsFontSizeToFit numberOfLines={1}>
            {formatMoney(earns ?? order.totalTnd)}
          </Text>
        </View>
        <View style={styles.trip}>
          <Text variant="metaStrong">
            {t('delivery.tripSummary', { minutes: order.durationMinutes, km: formatKm(order.distanceKm) })}
          </Text>
          <Text variant="meta" color="inkMuted" style={styles.regular}>
            {paymentLine}
          </Text>
        </View>
      </View>

      <View style={styles.stops}>
        <StopRow
          icon="store"
          caption={t('delivery.pickupDistance', { minutes: order.etaToStoreMinutes })}
          name={order.store.name}
          address={order.store.address}
        />
        <Divider />
        {/* Before accepting, the rider only sees the customer's area. */}
        <StopRow icon="pin" caption={t('delivery.dropoff')} name={order.customer.areaLabel} />
      </View>

      <View style={styles.actions}>
        <SecondaryButton
          label={t('delivery.decline')}
          onPress={onDecline}
          disabled={accepting}
          style={styles.decline}
        />
        <PrimaryButton
          label={accepting ? t('delivery.accepting') : t('delivery.accept')}
          onPress={onAccept}
          loading={accepting}
          style={styles.flex}
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles((c, t) => ({
  card: {
    gap: 14,
  },
  flex: {
    flex: 1,
  },
  regular: {
    fontFamily: t.typography.description.fontFamily,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: c.surfaceSunken,
    overflow: 'hidden',
    marginTop: -6,
  },
  fill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: c.primary,
    transformOrigin: 'left',
  },
  earnings: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  trip: {
    alignItems: 'flex-end',
    gap: 2,
    paddingBottom: 4,
  },
  stops: {
    borderWidth: 1,
    borderColor: c.divider,
    borderRadius: t.radius.thumb,
    paddingVertical: 4,
    paddingHorizontal: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  decline: {
    width: 120,
  },
}));
