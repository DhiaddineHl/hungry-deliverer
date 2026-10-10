import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton, TextLink } from '@/components/ui/button';
import { Card, Divider, IconWell } from '@/components/ui/content';
import { Text } from '@/components/ui/text';
import { ThemedStatusBar } from '@/components/ui/themed-status-bar';
import { useLocale } from '@/contexts/locale-context';
import { formatKm, formatMoney } from '@/features/format';
import type { Order } from '@/features/session/types';
import { Icon, makeStyles, type IconName } from '@/theme';

function shortName(name: string): string {
  return name.split(/\s[–-]\s/)[0].trim();
}

/**
 * D9 — delivery complete. A full-screen success state over the map: what the
 * trip earned (or, while the backend doesn't send earnings, the order total,
 * labelled), the trip facts, and the two ways on.
 *
 * The session already heads back to finding orders on its own after a short
 * pause; the button only makes that immediate.
 */
export function TripComplete({
  order,
  onFindNext,
  onGoOffline,
}: {
  order: Order;
  onFindNext: () => void;
  onGoOffline: () => void;
}) {
  const { t } = useLocale();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const earned = order.riderEarningsTnd;

  return (
    <Animated.View entering={FadeIn.duration(220)} style={[styles.screen, { paddingTop: insets.top + 48 }]}>
      <ThemedStatusBar />
      <View style={styles.body}>
        <View style={styles.well}>
          <Icon name="success" size="state" color="success" />
        </View>
        <Text variant="title" align="center" accessibilityRole="header">
          {t('delivery.deliveredTitle')}
        </Text>
        {order.arrivedAt ? (
          <Text variant="bodySmall" color="inkMuted" align="center">
            {t('delivery.arrivedAt', { time: order.arrivedAt })}
          </Text>
        ) : null}

        <Card style={styles.card}>
          <View style={styles.hero}>
            <Text variant="caption" color="inkMuted" style={styles.regular}>
              {earned !== null ? t('delivery.youEarned') : t('delivery.orderTotal')}
            </Text>
            <Text variant="successAmount">{formatMoney(earned ?? order.totalTnd)}</Text>
            <Text variant="meta" color="inkMuted" style={styles.regular} numberOfLines={2}>
              {t('delivery.tripRoute', {
                number: order.reference,
                from: shortName(order.store.name),
                to: shortName(order.customer.name),
              })}
            </Text>
          </View>
          {order.paymentMethod === 'cash' ? (
            <>
              <Divider />
              <FactRow icon="cash" label={t('delivery.cashCollected')} value={formatMoney(order.totalTnd)} />
            </>
          ) : null}
          <Divider />
          <FactRow
            icon="route"
            label={t('delivery.distance')}
            value={`${formatKm(order.distanceKm)} · ${order.durationMinutes} min`}
          />
        </Card>
      </View>

      <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
        <Text variant="caption" color="inkMuted" align="center" style={styles.regular}>
          {t('delivery.autoNext')}
        </Text>
        <PrimaryButton label={t('delivery.findNext')} onPress={onFindNext} />
        <TextLink label={t('delivery.goOffline')} onPress={onGoOffline} style={styles.link} />
      </View>
    </Animated.View>
  );
}

function FactRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.fact}>
      <IconWell icon={icon} />
      <Text variant="description" color="inkMuted" style={styles.factLabel}>
        {label}
      </Text>
      <Text variant="price">{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((c, t) => ({
  screen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: c.background,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: t.screenPadding,
  },
  well: {
    width: t.size.stateWell,
    height: t.size.stateWell,
    borderRadius: t.size.stateWell / 2,
    backgroundColor: c.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    alignSelf: 'stretch',
    marginTop: 12,
  },
  hero: {
    padding: 16,
    gap: 2,
  },
  regular: {
    fontFamily: t.typography.description.fontFamily,
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  factLabel: {
    flex: 1,
  },
  actions: {
    paddingHorizontal: t.screenPadding,
    gap: 12,
  },
  link: {
    alignSelf: 'center',
    paddingVertical: 6,
  },
}));
