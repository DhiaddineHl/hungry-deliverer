import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { useLocale } from '@/contexts/locale-context';
import { makeStyles } from '@/hooks/use-themed-styles';
import { useColors } from '@/contexts/theme-context';
import { OrderItemsList } from '@/components/sheets/order-items-list';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SlideToConfirm } from '@/components/ui/slide-to-confirm';
import { Text } from '@/components/ui/text';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import type { Order, SessionPhase } from '@/features/session/types';

type ActivePhase = Extract<
  SessionPhase,
  'toStore' | 'orderReady' | 'toCustomer' | 'completed'
>;

type Props = {
  order: Order;
  phase: ActivePhase;
  expanded: boolean;
  onToggle: () => void;
  onCall: (phone: string) => void;
  onOpenOrderNumber: () => void;
  onValidate: () => void;
  onConfirmDelivery: () => void;
};

function headerLabel(t: ReturnType<typeof useLocale>['t'], order: Order, phase: ActivePhase) {
  switch (phase) {
    case 'toStore':
      return t('delivery.minutesToPickup', { count: order.minutesToPickup });
    case 'orderReady':
      return t('delivery.orderReady');
    case 'toCustomer':
      return t('delivery.expectedArrival', { time: order.expectedArrival });
    case 'completed':
      return t('delivery.arrivedAhead', { time: order.arrivedAt });
  }
}

/**
 * The bottom sheet for an accepted order. Collapsed it is a single bar; expanded
 * it shows the contact, the order and the phase's call to action.
 */
export function ActiveOrderSheet({
  order,
  phase,
  expanded,
  onToggle,
  onCall,
  onOpenOrderNumber,
  onValidate,
  onConfirmDelivery,
}: Props) {
  const { t } = useLocale();
  const colors = useColors();
  const styles = useStyles();
  const [ctaWidth, setCtaWidth] = useState(0);

  const atStore = phase === 'toStore' || phase === 'orderReady';
  const contact = atStore ? order.store : order.customer;

  const handleCall = useCallback(() => onCall(contact.phone), [contact.phone, onCall]);

  const handleCtaLayout = useCallback((event: LayoutChangeEvent) => {
    setCtaWidth(event.nativeEvent.layout.width);
  }, []);

  return (
    <Animated.View layout={LinearTransition.duration(240)} style={styles.sheet}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? t('delivery.collapseOrderDetails') : t('delivery.expandOrderDetails')}
          accessibilityState={{ expanded }}
          onPress={onToggle}
          hitSlop={12}
          style={styles.headerIcon}>
          <Ionicons
            name={expanded ? 'chevron-down' : 'chevron-up'}
            size={22}
            color={colors.text}
          />
        </Pressable>

        <Text weight="medium" size={15} numberOfLines={1} style={styles.headerLabel}>
          {headerLabel(t, order, phase)}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('delivery.orderDetails')}
          onPress={onToggle}
          hitSlop={12}
          style={styles.headerIcon}>
          <Ionicons name="menu" size={22} color={colors.text} />
        </Pressable>
      </View>

      {expanded ? (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(120)}>
          <View style={styles.contactRow}>
            <View style={styles.contactText}>
              <Text weight="bold" size={22}>
                {contact.name}
              </Text>
              <Text size={15} color={colors.textSecondary} style={styles.address}>
                {contact.address}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Call ${contact.name}`}
              onPress={handleCall}
              style={({ pressed }) => [styles.call, pressed && styles.pressed]}>
              <Ionicons name="call" size={22} color={colors.onNavy} />
            </Pressable>
          </View>

          <View style={styles.divider} />

          <View style={styles.orderRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Show order number ${order.reference} to the store`}
              onPress={onOpenOrderNumber}
              disabled={!atStore}
              style={styles.orderRef}>
              <Text weight="bold" size={19}>
                Order #{order.reference}
              </Text>
              {atStore ? (
                <Ionicons name="chevron-forward" size={18} color={colors.text} />
              ) : null}
            </Pressable>

            <Text size={15} color={colors.textSecondary}>
              Total:{' '}
              <Text weight="bold" size={15} color={colors.orange}>
                {order.totalTnd.toFixed(1)} TND
              </Text>
            </Text>
          </View>

          <Text size={13} color={colors.teal} style={styles.itemCount}>
            {order.items.length} items
          </Text>

          <OrderItemsList items={order.items} />

          <View style={styles.cta} onLayout={handleCtaLayout}>
            {atStore ? (
              <PrimaryButton
                label={t('delivery.validateOrder')}
                onPress={onValidate}
                disabled={phase === 'toStore'}
              />
            ) : ctaWidth > 0 ? (
              <SlideToConfirm
                label={t('delivery.confirmDelivery')}
                trackWidth={ctaWidth}
                confirmed={phase === 'completed'}
                onConfirm={onConfirmDelivery}
              />
            ) : null}
          </View>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const useStyles = makeStyles((c) => ({
  sheet: {
    backgroundColor: c.card,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.four,
    ...Shadow.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  headerIcon: {
    width: 24,
    alignItems: 'center',
  },
  headerLabel: {
    flex: 1,
    textAlign: 'center',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    marginTop: Spacing.four,
  },
  contactText: {
    flex: 1,
  },
  address: {
    marginTop: 2,
  },
  call: {
    width: 48,
    height: 48,
    borderRadius: Radius.pill,
    backgroundColor: c.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: c.border,
    marginVertical: Spacing.four,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderRef: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  itemCount: {
    marginTop: 2,
    marginBottom: Spacing.three,
  },
  cta: {
    marginTop: Spacing.five,
  },
  pressed: {
    opacity: 0.8,
  },
}));
