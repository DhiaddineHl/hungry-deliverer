import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useLocale } from '@/contexts/locale-context';
import { makeStyles } from '@/hooks/use-themed-styles';
import { useColors } from '@/contexts/theme-context';
import { PrimaryButton } from '@/components/ui/primary-button';
import { PageShell } from '@/components/ui/page-shell';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import {
  CASH_OUT_FEE,
  formatBalance,
  formatDinars,
  PAYOUT_METHOD,
  WALLET_BALANCE,
  WALLET_TRANSACTIONS,
  WEEK_STATS,
  type WalletTransaction,
} from '@/data/earnings';

/** Tallest bar in the chart, in points. */
const CHART_HEIGHT = 120;

/**
 * The wallet: what can be cashed out right now, how the week went, where the
 * money lands, and the last few movements.
 *
 * "History" and "See all" both lead to the delivery-history screen — the frame
 * gives them separate links, but there is one list of past work behind both.
 */
export default function WalletScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useLocale();
  const router = useRouter();
  const openHistory = () => router.push('/delivery-history');

  // Cashing out and editing the payout method are the two actions with no
  // endpoint behind them yet (see data/earnings.ts) — wired to nothing rather
  // than hidden, so the frame stays intact and the gap is one call each.
  const cashOut = () => {};
  const managePayoutMethod = () => {};

  return (
    <PageShell title={t('wallet.title')}>
      <View style={styles.balanceHeader}>
        <Text size={20}>{t('wallet.balance')}</Text>
        <LinkText label={t('wallet.history')} onPress={openHistory} />
      </View>

      <View style={styles.balanceBlock}>
        <Text size={17} color={colors.textMuted}>
          {t('wallet.availableForCashOut')}
        </Text>
        <View style={styles.balanceRow}>
          <Text weight="bold" size={44} color={colors.orange}>
            {formatBalance(WALLET_BALANCE.amount)}
          </Text>
          <Text weight="bold" size={16} color={colors.orange} style={styles.balanceCurrency}>
            {t('common.tnd')}
          </Text>
        </View>

        <PrimaryButton label={t('wallet.cashOutNow')} onPress={cashOut} style={styles.cashOut} />

        <Text size={14} color={colors.textMuted}>
          {t('wallet.cashOutCaption', {
            fee: CASH_OUT_FEE.amount,
            currency: t('common.tnd'),
          })}
        </Text>
        <LinkText
          label={t('wallet.managePayoutMethod')}
          onPress={managePayoutMethod}
          weight="semibold"
        />
      </View>

      <View style={styles.divider} />

      <Text weight="bold" size={19}>
        {t('wallet.thisWeek')}
      </Text>
      <View style={styles.stats}>
        <Stat value={String(WEEK_STATS.trips)} label={t('wallet.trips')} />
        <Stat value={WEEK_STATS.onlineTime} label={t('wallet.onlineTime')} />
        <Stat
          value={`${formatBalance(WEEK_STATS.averagePerTrip.amount)} ${t('common.tnd')}`}
          label={t('wallet.avgPerTrip')}
        />
      </View>

      <Text weight="bold" size={17} style={styles.chartTitle}>
        {t('wallet.earningsThisWeek')}
      </Text>
      <WeekChart />

      <View style={styles.divider} />

      <View style={styles.sectionHeader}>
        <Text weight="bold" size={19}>
          {t('wallet.paymentMethod')}
        </Text>
        <LinkText label={t('wallet.manage')} onPress={managePayoutMethod} weight="semibold" />
      </View>
      <View style={styles.payout}>
        <View style={styles.payoutIcon}>
          <Ionicons name="card-outline" size={22} color={colors.onNavy} />
        </View>
        <View>
          <Text weight="semibold" size={16}>
            •••• •••• •••• {PAYOUT_METHOD.last4}
          </Text>
          <Text size={14} color={colors.textMuted}>
            {t('wallet.debitCard')}
            {PAYOUT_METHOD.isPrimary ? ` · ${t('wallet.primary')}` : ''}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.sectionHeader}>
        <Text weight="bold" size={19}>
          {t('wallet.ordersHistory')}
        </Text>
        <LinkText label={t('wallet.seeAll')} onPress={openHistory} weight="semibold" />
      </View>
      {WALLET_TRANSACTIONS.map((transaction) => (
        <TransactionRow key={transaction.id} transaction={transaction} />
      ))}

      <LinkText
        label={t('wallet.viewAllTransactions')}
        onPress={openHistory}
        weight="semibold"
        style={styles.viewAll}
      />
    </PageShell>
  );
}

/** One of the three figures under "This week". */
function Stat({ value, label }: { value: string; label: string }) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={styles.stat}>
      <Text weight="bold" size={22} color={colors.orange} numberOfLines={1}>
        {value}
      </Text>
      <Text size={15} color={colors.textMuted}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Seven bars scaled against the best day of the week, with today picked out in
 * orange. A hand-drawn chart rather than a charting dependency: it is one
 * series of seven values, and the frame asks for nothing else — no axis, no
 * gridlines, no interaction.
 */
function WeekChart() {
  const { t } = useLocale();
  const colors = useColors();
  const styles = useStyles();
  const peak = Math.max(...WEEK_STATS.daily.map((entry) => entry.amount), 1);

  return (
    <View style={styles.chart}>
      {WEEK_STATS.daily.map((entry, index) => {
        const isToday = index === WEEK_STATS.todayIndex;
        return (
          <View key={entry.day} style={styles.chartColumn}>
            <View style={styles.chartTrack}>
              <View
                accessibilityLabel={`${t(`weekdays.${entry.day}`)}: ${formatDinars(entry.amount)} ${t('common.tnd')}`}
                style={[
                  styles.bar,
                  {
                    // A floor of 6pt keeps a quiet day visible as a stub
                    // instead of collapsing it to nothing.
                    height: Math.max(6, (entry.amount / peak) * CHART_HEIGHT),
                    backgroundColor: isToday ? colors.orange : colors.chartBar,
                  },
                ]}
              />
            </View>
            <Text size={14} color={colors.textMuted}>
              {t(`weekdays.${entry.day}`)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Composes "Order #2043 · Today, 14:32" from its parts, in the right order. */
function transactionLabel(
  t: ReturnType<typeof useLocale>['t'],
  transaction: WalletTransaction
): string {
  const what =
    transaction.kind === 'order'
      ? t('wallet.orderTransaction', { number: transaction.orderNumber ?? '' })
      : t(transaction.kind === 'bonus' ? 'wallet.weeklyBonus' : 'wallet.cashOut');
  const whenKey =
    transaction.when === 'today'
      ? 'wallet.today'
      : transaction.when === 'yesterday'
        ? 'wallet.yesterday'
        : 'wallet.monday';
  return `${what} · ${t(whenKey, { time: transaction.time })}`;
}

function TransactionRow({ transaction }: { transaction: WalletTransaction }) {
  const { t } = useLocale();
  const colors = useColors();
  const styles = useStyles();
  const isCredit = transaction.amount >= 0;
  return (
    <View style={styles.transaction}>
      <View style={styles.transactionIcon}>
        <Ionicons name={transaction.icon} size={18} color={colors.onNavy} />
      </View>
      <Text size={15} style={styles.transactionLabel} numberOfLines={1}>
        {transactionLabel(t, transaction)}
      </Text>
      <Text weight="bold" size={15} color={isCredit ? colors.orange : colors.text}>
        {isCredit ? '+' : '−'}
        {Math.abs(transaction.amount).toFixed(2)} {t('common.tnd')}
      </Text>
    </View>
  );
}

/** The teal inline actions the frame uses instead of buttons. */
function LinkText({
  label,
  onPress,
  weight = 'regular',
  style,
}: {
  label: string;
  onPress: () => void;
  weight?: 'regular' | 'semibold';
  style?: object;
}) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [pressed && styles.pressed, style]}>
      <Text weight={weight} size={17} color={colors.teal}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceBlock: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.three,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  balanceCurrency: {
    marginTop: Spacing.two,
    marginLeft: Spacing.one,
  },
  cashOut: {
    alignSelf: 'stretch',
    marginHorizontal: Spacing.six,
    marginVertical: Spacing.three,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
    marginVertical: Spacing.five,
  },
  stats: {
    flexDirection: 'row',
    paddingTop: Spacing.four,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  chartTitle: {
    marginTop: Spacing.five,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.two,
  },
  chartTrack: {
    height: CHART_HEIGHT,
    justifyContent: 'flex-end',
    alignSelf: 'stretch',
  },
  bar: {
    borderRadius: Radius.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.four,
    padding: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: c.surface,
  },
  payoutIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    backgroundColor: c.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transaction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: c.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionLabel: {
    flex: 1,
  },
  viewAll: {
    alignSelf: 'center',
    paddingTop: Spacing.four,
  },
  pressed: {
    opacity: 0.6,
  },
}));
