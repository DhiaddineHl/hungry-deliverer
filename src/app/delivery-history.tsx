import { Fragment, useState } from 'react';
import { View } from 'react-native';

import { Card, Divider, IconWell, Overline } from '@/components/ui/content';
import { StateView } from '@/components/ui/feedback';
import { Page } from '@/components/ui/page';
import { SegmentedControl } from '@/components/ui/selection';
import { Text } from '@/components/ui/text';
import { useLocale } from '@/contexts/locale-context';
import {
  CATEGORY_ICONS,
  DELIVERY_HISTORY,
  MONTH_RECAP,
  WEEK_RECAP,
  type DeliveryRecord,
} from '@/data/earnings';
import { formatMoney } from '@/features/format';
import { Icon, makeStyles } from '@/theme';

type Period = 'week' | 'month';

/**
 * H1 — completed trips, newest first, grouped by day under a recap of what the
 * chosen period has paid. Placeholder figures until the backend has an
 * earnings endpoint (see data/earnings.ts).
 */
export default function DeliveryHistoryScreen() {
  const { t } = useLocale();
  const styles = useStyles();
  const [period, setPeriod] = useState<Period>('month');
  const recap = period === 'week' ? WEEK_RECAP : MONTH_RECAP;
  const up = recap.changePercent >= 0;
  const change = `${up ? '+' : '−'}${Math.abs(recap.changePercent)}%`;

  return (
    <Page title={t('history.title')}>
      <SegmentedControl
        segments={[
          { key: 'week', label: t('history.thisWeek') },
          { key: 'month', label: t('history.thisMonth') },
        ]}
        value={period}
        onChange={setPeriod}
        style={styles.segments}
      />

      <Card style={styles.recap}>
        <View style={styles.recapFigures}>
          <Text variant="meta" color="inkMuted" style={styles.regular}>
            {period === 'week' ? t('history.earnedWeek') : t('history.earnedMonth')}
          </Text>
          <Text variant="successAmount" adjustsFontSizeToFit numberOfLines={1}>
            {formatMoney(recap.earned.amount)}
          </Text>
          <Text variant="meta" color="inkMuted" style={styles.regular}>
            {recap.trips === 1 ? t('common.tripsOne') : t('common.tripsOther', { count: recap.trips })}
          </Text>
        </View>
        <View style={[styles.trend, !up && styles.trendDown]}>
          <Icon name={up ? 'trendUp' : 'trendDown'} size="inline" color={up ? 'success' : 'danger'} />
          <Text variant="label" color={up ? 'success' : 'danger'}>
            {period === 'week'
              ? t('history.vsLastWeek', { change })
              : t('history.vsLastMonth', { change })}
          </Text>
        </View>
      </Card>

      {DELIVERY_HISTORY.length === 0 ? (
        <StateView
          icon="history"
          title={t('history.emptyTitle')}
          body={t('history.emptyBody')}
          style={styles.empty}
        />
      ) : (
        DELIVERY_HISTORY.map((day) => (
          <View key={day.date}>
            <Overline style={styles.dayHeading}>
              {t(day.bucket === 'today' ? 'history.today' : 'history.yesterday', { date: day.date })}
            </Overline>
            {day.records.map((record, index) => (
              <Fragment key={record.id}>
                {index > 0 ? <Divider /> : null}
                <HistoryRow record={record} />
              </Fragment>
            ))}
          </View>
        ))
      )}
    </Page>
  );
}

function HistoryRow({ record }: { record: DeliveryRecord }) {
  const { t } = useLocale();
  const styles = useStyles();
  const status = t(`history.${record.status}`);
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${record.merchant}, ${record.time}, ${status}, ${formatMoney(record.fee.amount)}`}>
      <IconWell icon={CATEGORY_ICONS[record.category]} />
      <View style={styles.rowText}>
        <Text variant="itemTitle" numberOfLines={1}>
          {record.merchant}
        </Text>
        <Text variant="caption" color="inkMuted" style={styles.regular}>
          {record.time} · {status}
        </Text>
      </View>
      <Text variant="price">{formatMoney(record.fee.amount)}</Text>
    </View>
  );
}

const useStyles = makeStyles((c, t) => ({
  regular: {
    fontFamily: t.typography.description.fontFamily,
  },
  segments: {
    marginTop: 12,
  },
  recap: {
    marginTop: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  recapFigures: {
    gap: 2,
    flexShrink: 1,
  },
  trend: {
    height: 30,
    borderRadius: 15,
    backgroundColor: c.successSoft,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trendDown: {
    backgroundColor: c.dangerSoft,
  },
  dayHeading: {
    marginTop: 20,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  empty: {
    marginTop: 48,
  },
}));
