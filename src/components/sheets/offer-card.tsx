import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { PrimaryButton } from '@/components/ui/primary-button';
import { Text } from '@/components/ui/text';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
import type { Order, RouteLeg } from '@/features/session/types';

type LegRowProps = {
  leg: RouteLeg;
  label: string;
  selected: boolean;
  onSelect: (leg: RouteLeg) => void;
};

function LegRow({ leg, label, selected, onSelect }: LegRowProps) {
  const handlePress = useCallback(() => onSelect(leg), [leg, onSelect]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Show ${label} on the map`}
      onPress={handlePress}
      style={styles.legRow}>
      <View style={styles.bullet} />
      <Text
        weight={selected ? 'bold' : 'regular'}
        size={16}
        numberOfLines={1}
        style={styles.legLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

type Props = {
  order: Order;
  previewedLeg: RouteLeg;
  countdownMs: number;
  onPreviewLeg: (leg: RouteLeg) => void;
  onAccept: () => void;
  onDecline: () => void;
};

/** "Order Found" — the offer on the table, with the auto-decline countdown. */
export function OfferCard({
  order,
  previewedLeg,
  countdownMs,
  onPreviewLeg,
  onAccept,
  onDecline,
}: Props) {
  return (
    <Animated.View
      entering={FadeInDown.duration(280)}
      exiting={FadeOutDown.duration(180)}
      style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.chip}>
          <Text weight="medium" size={14} color={Colors.orange}>
            Delivery
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Decline order"
          onPress={onDecline}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
          <Ionicons name="close" size={20} color={Colors.orange} />
        </Pressable>
      </View>

      <Text weight="bold" size={34} style={styles.payout}>
        {order.payoutTnd.toFixed(1)} TND
      </Text>

      <View style={styles.metaRow}>
        <Ionicons name="time-outline" size={18} color={Colors.text} />
        <Text size={16}>
          {order.durationMinutes} mins ({order.distanceKm} km) total
        </Text>
      </View>

      <View style={styles.legs}>
        <View style={styles.legRows}>
          <View style={styles.connector} />
          <LegRow
            leg="store"
            label={order.store.name}
            selected={previewedLeg === 'store'}
            onSelect={onPreviewLeg}
          />
          <LegRow
            leg="customer"
            label={order.customer.areaLabel}
            selected={previewedLeg === 'customer'}
            onSelect={onPreviewLeg}
          />
        </View>

        {/* Sits on its own line so it never squeezes a leg's name. */}
        <View style={styles.tooltip}>
          <Text weight="medium" size={12} color={Colors.white}>
            Tap to see location
          </Text>
        </View>
      </View>

      <PrimaryButton
        label="Accept and Go"
        onPress={onAccept}
        countdownMs={countdownMs}
        style={styles.cta}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.five,
    ...Shadow.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chip: {
    backgroundColor: Colors.orangeSoft,
    paddingHorizontal: Spacing.four,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    backgroundColor: Colors.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payout: {
    textAlign: 'center',
    marginTop: Spacing.four,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.five,
  },
  legs: {
    marginTop: Spacing.four,
    marginBottom: Spacing.five,
  },
  legRows: {
    position: 'relative',
  },
  /** The hairline joining the two bullets. */
  connector: {
    position: 'absolute',
    left: 4,
    top: 22,
    bottom: 22,
    width: 1,
    backgroundColor: Colors.text,
  },
  legRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  bullet: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.text,
  },
  legLabel: {
    flexShrink: 1,
  },
  tooltip: {
    alignSelf: 'flex-start',
    marginTop: Spacing.two,
    marginLeft: 21,
    backgroundColor: Colors.teal,
    paddingHorizontal: Spacing.three,
    paddingVertical: 5,
    borderRadius: Radius.sm,
  },
  cta: {
    marginTop: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
