import { useRouter } from 'expo-router';
import { Fragment } from 'react';
import { View } from 'react-native';

import { PrimaryButton, TextLink } from '@/components/ui/button';
import { Card, Divider, IconWell } from '@/components/ui/content';
import { Page, SectionHeader } from '@/components/ui/page';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useLocale } from '@/contexts/locale-context';
import {
  PAYOUT_METHOD,
  WALLET_BALANCE,
  WALLET_TRANSACTIONS,
  WEEK_STATS,
  WITHDRAW_FEE,
  type WalletTransaction,
} from '@/data/earnings';
import { formatDuration, formatMoney, formatSignedMoney } from '@/features/format';
import { makeStyles, useTheme, type IconName } from '@/theme';

/**
 * W1/W2 — Earnings: what can be withdrawn now, how the week went, where the
 * money lands, and the last few movements. Figures come from the placeholder
 * module until the backend has earnings endpoints (see data/earnings.ts).
 */
export default function WalletScreen() {
  const { t } = useLocale();
  const styles = useStyles();
  const router = useRouter();
  const showToast = useToast((state) => state.show);
  const openHistory = () => router.push('/delivery-history');
  // Withdrawing and managing the payout method have no endpoint yet; they say
  // so instead of silently doing nothing.
  const notYet = () => showToast(t('wallet.notAvailable'));

  return (
    <Page title={t('wallet.title')} trailing={<TextLink label={t('wallet.history')} onPress={openHistory} />}>
      <Card style={styles.balance}>
        <View style={styles.balanceFigure}>
          <Text variant="meta" color="inkMuted" style={styles.regular}>
            {t('wallet.availableToWithdraw')}
          </Text>
          <Text variant="offerAmount" adjustsFontSizeToFit numberOfLines={1}>
            {formatMoney(WALLET_BALANCE.amount)}
          </Text>
        </View>
        <PrimaryButton label={t('wallet.withdrawNow')} icon="withdraw" onPress={notYet} />
        <Text variant="caption" color="inkMuted" align="center" style={styles.regular}>
          {t('wallet.withdrawCaption', { fee: formatMoney(WITHDRAW_FEE.amount) })}
        </Text>
      </Card>

      <SectionHeader
        title={t('wallet.thisWeek')}
        trailing={
          <Text variant="meta" color="inkMuted" tabular style={styles.regular}>
            {formatMoney(WEEK_STATS.total.amount)}
          </Text>
        }
        style={styles.section}
      />
      <Card radius="thumb" style={styles.stats}>
        <Stat value={String(WEEK_STATS.trips)} label={t('wallet.trips')} />
        <View style={styles.statDivider} />
        <Stat value={formatDuration(WEEK_STATS.onlineMinutes).replace(' min', '')} label={t('wallet.online')} />
        <View style={styles.statDivider} />
        <Stat value={formatMoney(WEEK_STATS.averagePerTrip.amount)} label={t('wallet.avgPerTrip')} />
      </Card>
      <WeeklyBarChart />

      <SectionHeader
        title={t('wallet.payoutMethod')}
        trailing={<TextLink label={t('wallet.manage')} onPress={notYet} />}
        style={styles.sectionLarge}
      />
      <Card radius="thumb" style={styles.payout}>
        <IconWell icon="payoutCard" tone="ink" />
        <View style={styles.flex}>
          <Text variant="itemTitle" style={styles.cardDigits}>
            •••• {PAYOUT_METHOD.last4}
          </Text>
          <Text variant="caption" color="inkMuted" style={styles.regular}>
            {t('wallet.bankCard')}
            {PAYOUT_METHOD.isPrimary ? ` · ${t('wallet.primary')}` : ''}
          </Text>
        </View>
      </Card>

      <SectionHeader
        title={t('wallet.recentActivity')}
        trailing={<TextLink label={t('wallet.seeAll')} onPress={openHistory} />}
        style={styles.sectionLarge}
      />
      <View style={styles.transactions}>
        {WALLET_TRANSACTIONS.map((transaction, index) => (
          <Fragment key={transaction.id}>
            {index > 0 ? <Divider /> : null}
            <TransactionRow transaction={transaction} />
          </Fragment>
        ))}
      </View>
    </Page>
  );
}

/** One cell of the three-column week grid. */
function Stat({ value, label }: { value: string; label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.stat}>
      <Text variant="stat" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text variant="caption" color="inkMuted" style={styles.regular}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Seven bars scaled against the week's best day; today in orange with its
 * amount above it. Hand-drawn: one series of seven values, no axis, no
 * interaction — a charting dependency would be all cost.
 */
function WeeklyBarChart() {
  const { t } = useLocale();
  const { size } = useTheme();
  const styles = useStyles();
  const peak = Math.max(...WEEK_STATS.daily.map((entry) => entry.amount), 1);
  const noTrips = WEEK_STATS.daily.every((entry) => entry.amount === 0);

  return (
    <View style={styles.chart}>
      <View style={[styles.bars, { height: size.chartHeight }]}>
        {WEEK_STATS.daily.map((entry, index) => {
          const isToday = index === WEEK_STATS.todayIndex;
          // A 6 pt floor keeps a quiet day visible instead of collapsing it.
          const height = Math.max(6, (entry.amount / peak) * (size.chartHeight - 20));
          return (
            <View
              key={entry.day}
              style={styles.barColumn}
              accessible
              accessibilityLabel={`${t(`weekdays.${entry.day}`)}: ${formatMoney(entry.amount)}`}>
              {isToday && !noTrips ? <Text variant="chartValue">{formatMoney(entry.amount)}</Text> : null}
              <View style={[styles.bar, isToday && styles.barToday, { height }]} />
            </View>
          );
        })}
      </View>
      <View style={styles.days}>
        {WEEK_STATS.daily.map((entry, index) => {
          const isToday = index === WEEK_STATS.todayIndex;
          return (
            <Text
              key={entry.day}
              variant="caption"
              color={isToday ? 'ink' : 'inkMuted'}
              align="center"
              style={[styles.day, isToday && styles.dayToday]}>
              {t(`weekdays.${entry.day}`)}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const TRANSACTION_ICONS: Record<WalletTransaction['kind'], IconName> = {
  order: 'delivery',
  bonus: 'bonus',
  withdrawal: 'withdraw',
};

function TransactionRow({ transaction }: { transaction: WalletTransaction }) {
  const { t } = useLocale();
  const styles = useStyles();
  const credit = transaction.amount >= 0;
  const title =
    transaction.kind === 'order'
      ? t('wallet.orderTransaction', { number: transaction.orderNumber ?? '' })
      : transaction.kind === 'bonus'
        ? t('wallet.weeklyBonus')
        : t('wallet.withdrawal');
  const when = t(`wallet.${transaction.when}`, { time: transaction.time });

  return (
    <View style={styles.transaction} accessible accessibilityLabel={`${title}, ${when}, ${formatSignedMoney(transaction.amount)}`}>
      <IconWell icon={TRANSACTION_ICONS[transaction.kind]} tone={transaction.kind === 'bonus' ? 'primary' : 'neutral'} />
      <View style={styles.flex}>
        <Text variant="itemLabel" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" color="inkMuted" style={styles.regular}>
          {when}
        </Text>
      </View>
      <Text variant="price" color={credit ? 'success' : 'ink'}>
        {formatSignedMoney(transaction.amount)}
      </Text>
    </View>
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
  balance: {
    marginTop: 12,
    padding: 20,
    gap: 14,
  },
  balanceFigure: {
    gap: 2,
  },
  section: {
    marginTop: 24,
    marginBottom: 12,
  },
  sectionLarge: {
    marginTop: 28,
    marginBottom: 12,
  },
  stats: {
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
    padding: 12,
    gap: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: c.divider,
  },
  chart: {
    marginTop: 12,
    gap: 8,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  bar: {
    alignSelf: 'stretch',
    borderRadius: 8,
    backgroundColor: c.chartBar,
  },
  barToday: {
    backgroundColor: c.chartBarCurrent,
  },
  days: {
    flexDirection: 'row',
    gap: 8,
  },
  day: {
    flex: 1,
  },
  dayToday: {
    fontFamily: t.typography.badge.fontFamily,
  },
  payout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  cardDigits: {
    letterSpacing: 1,
  },
  transactions: {
    marginTop: 4,
  },
  transaction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
}));
