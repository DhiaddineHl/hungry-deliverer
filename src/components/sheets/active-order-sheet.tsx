import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { OrderItemsList } from '@/components/sheets/order-items-list';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SlideToConfirm } from '@/components/ui/slide-to-confirm';
import { Text } from '@/components/ui/text';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
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

function headerLabel(order: Order, phase: ActivePhase) {
  switch (phase) {
    case 'toStore':
      return `${order.minutesToPickup} minutes left to pickup`;
    case 'orderReady':
      return 'Your order is ready !';
    case 'toCustomer':
      return `Expected arrival : ${order.expectedArrival}`;
    case 'completed':
      return `Arrived at ${order.arrivedAt} - Ahead of time`;
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
          accessibilityLabel={expanded ? 'Collapse order details' : 'Expand order details'}
          accessibilityState={{ expanded }}
          onPress={onToggle}
          hitSlop={12}
          style={styles.headerIcon}>
          <Ionicons
            name={expanded ? 'chevron-down' : 'chevron-up'}
            size={22}
            color={Colors.text}
          />
        </Pressable>

        <Text weight="medium" size={15} numberOfLines={1} style={styles.headerLabel}>
          {headerLabel(order, phase)}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Order details"
          onPress={onToggle}
          hitSlop={12}
          style={styles.headerIcon}>
          <Ionicons name="menu" size={22} color={Colors.text} />
        </Pressable>
      </View>

      {expanded ? (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(120)}>
          <View style={styles.contactRow}>
            <View style={styles.contactText}>
              <Text weight="bold" size={22}>
                {contact.name}
              </Text>
              <Text size={15} color={Colors.textSecondary} style={styles.address}>
                {contact.address}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Call ${contact.name}`}
              onPress={handleCall}
              style={({ pressed }) => [styles.call, pressed && styles.pressed]}>
              <Ionicons name="call" size={22} color={Colors.white} />
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
                <Ionicons name="chevron-forward" size={18} color={Colors.text} />
              ) : null}
            </Pressable>

            <Text size={15} color={Colors.textSecondary}>
              Total:{' '}
              <Text weight="bold" size={15} color={Colors.orange}>
                {order.totalTnd.toFixed(1)} TND
              </Text>
            </Text>
          </View>

          <Text size={13} color={Colors.teal} style={styles.itemCount}>
            {order.items.length} items
          </Text>

          <OrderItemsList items={order.items} />

          <View style={styles.cta} onLayout={handleCtaLayout}>
            {atStore ? (
              <PrimaryButton
                label="Validate Order"
                onPress={onValidate}
                disabled={phase === 'toStore'}
              />
            ) : ctaWidth > 0 ? (
              <SlideToConfirm
                label="Confirm Delivery"
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

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.card,
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
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
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
});
