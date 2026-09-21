import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { useLocale } from '@/contexts/locale-context';
import { makeStyles } from '@/hooks/use-themed-styles';
import { useColors } from '@/contexts/theme-context';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Text } from '@/components/ui/text';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import type { Order, RouteLeg } from '@/features/session/types';

type LegRowProps = {
  leg: RouteLeg;
  label: string;
  selected: boolean;
  onSelect: (leg: RouteLeg) => void;
};

function LegRow({ leg, label, selected, onSelect }: LegRowProps) {
  const styles = useStyles();
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
  /** An accept is in flight — the CTA is disabled until the backend answers. */
  accepting: boolean;
  onPreviewLeg: (leg: RouteLeg) => void;
  onAccept: () => void;
  onDecline: () => void;
};

/**
 * "Order Found" — the offer on the table, with the auto-decline countdown
 * running against the deadline the backend stamped on it (`order.countdownMs`,
 * fixed when the offer was mapped, so the sweep never restarts on a re-render).
 */
export function OfferCard({
  order,
  previewedLeg,
  accepting,
  onPreviewLeg,
  onAccept,
  onDecline,
}: Props) {
  const { t } = useLocale();
  const colors = useColors();
  const styles = useStyles();
  return (
    <Animated.View
      entering={FadeInDown.duration(280)}
      exiting={FadeOutDown.duration(180)}
      style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.chip}>
          <Text weight="medium" size={14} color={colors.orange}>
            {t('delivery.delivery')}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('delivery.declineOrder')}
          onPress={onDecline}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
          <Ionicons name="close" size={20} color={colors.orange} />
        </Pressable>
      </View>

      <Text weight="bold" size={34} style={styles.payout}>
        {order.totalTnd.toFixed(1)} TND
      </Text>
      <Text size={13} color={colors.textSecondary} style={styles.payoutCaption}>
        {t('delivery.orderTotal', { count: order.items.length })}
      </Text>

      <View style={styles.metaRow}>
        <Ionicons name="time-outline" size={18} color={colors.text} />
        <Text size={16}>{t('delivery.tripSummary', { minutes: order.durationMinutes, km: order.distanceKm })}</Text>
      </View>
      <View style={styles.metaRow}>
        <Ionicons name="storefront-outline" size={18} color={colors.text} />
        <Text size={16}>{t('delivery.pickupEta', { minutes: order.etaToStoreMinutes })}</Text>
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
          <Text weight="medium" size={12} color={colors.onNavy}>
            {t('delivery.tapToSeeLocation')}
          </Text>
        </View>
      </View>

      <PrimaryButton
        label={accepting ? t('delivery.accepting') : t('delivery.acceptAndGo')}
        disabled={accepting}
        onPress={onAccept}
        countdownMs={order.countdownMs}
        style={styles.cta}
      />
    </Animated.View>
  );
}

const useStyles = makeStyles((c) => ({
  card: {
    backgroundColor: c.card,
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
    backgroundColor: c.orangeSoft,
    paddingHorizontal: Spacing.four,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    backgroundColor: c.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payout: {
    textAlign: 'center',
    marginTop: Spacing.four,
  },
  payoutCaption: {
    textAlign: 'center',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
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
    backgroundColor: c.text,
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
    backgroundColor: c.text,
  },
  legLabel: {
    flexShrink: 1,
  },
  tooltip: {
    alignSelf: 'flex-start',
    marginTop: Spacing.two,
    marginLeft: 21,
    backgroundColor: c.teal,
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
}));
