import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { useLocale } from '@/contexts/locale-context';
import { makeStyles } from '@/hooks/use-themed-styles';
import { useColors } from '@/contexts/theme-context';
import { PageShell } from '@/components/ui/page-shell';
import { Card } from '@/components/ui/section';
import { Text } from '@/components/ui/text';
import { Radius, Spacing, tintColors } from '@/constants/theme';
import {
  DELIVERY_HISTORY,
  formatDinars,
  MONTH_RECAP,
  type DeliveryRecord,
} from '@/data/earnings';

/**
 * Completed trips, newest first, under a recap of what the month has paid so
 * far. Grouped by day, the way the frame reads: a dated rule, then the day's
 * rows.
 */
export default function DeliveryHistoryScreen() {
  const { t } = useLocale();
  const colors = useColors();
  const styles = useStyles();
  return (
    <PageShell title={t('history.title')}>
      <View style={styles.recap}>
        <Text weight="bold" size={17} color={colors.onNavy} style={styles.recapTitle}>
          {t('history.monthRecap')}
        </Text>

        <View style={styles.recapBody}>
          <View style={styles.recapFigures}>
            <View style={styles.amountRow}>
              <Text weight="bold" size={26} color={colors.onNavy}>
                {formatDinars(MONTH_RECAP.earned.amount)}
              </Text>
              <Text size={13} color={colors.onNavy} style={styles.currency}>
                {t('common.tnd')}
              </Text>
            </View>
            <Text size={17} color={colors.onNavy}>
              {t('history.earnedAcross', { count: MONTH_RECAP.trips })}
            </Text>
          </View>

          <View style={styles.growth}>
            <Text size={15} color={colors.onNavy}>
              {t('history.growth')}
            </Text>
            <Text weight="bold" size={16} color={colors.onNavy}>
              {MONTH_RECAP.growthPercent >= 0 ? '+' : '−'}
              {Math.abs(MONTH_RECAP.growthPercent)}%
            </Text>
          </View>
        </View>
      </View>

      {DELIVERY_HISTORY.map((day) => (
        <View key={day.date}>
          <View style={styles.dayHeading}>
            <View style={styles.rule} />
            <Text size={14} color={colors.textSecondary} style={styles.dayLabel}>
              {t(day.bucket === 'today' ? 'history.today' : 'history.yesterday', {
                date: day.date,
              })}
            </Text>
            <View style={styles.rule} />
          </View>

          {day.records.map((record) => (
            <TripRow key={record.id} record={record} />
          ))}
        </View>
      ))}

      <View style={styles.end}>
        <View style={styles.endRule} />
        <Ionicons name="rocket-outline" size={34} color={colors.textMuted} />
        <Text size={16} color={colors.textMuted} style={styles.endText}>
          {t('history.endOfList')}
        </Text>
      </View>
    </PageShell>
  );
}

function TripRow({ record }: { record: DeliveryRecord }) {
  const { t } = useLocale();
  const colors = useColors();
  const styles = useStyles();
  const tint = tintColors(colors, record.tint);

  return (
    <Card style={styles.trip}>
      <View style={styles.tripInner}>
        <View style={[styles.tripIcon, { backgroundColor: tint.background }]}>
          <Ionicons name={record.icon} size={22} color={tint.foreground} />
        </View>

        <View style={styles.tripText}>
          <Text weight="bold" size={17} numberOfLines={1}>
            {record.merchant}
          </Text>
          <View style={styles.tripMeta}>
            <Ionicons name="time-outline" size={15} color={colors.textSecondary} />
            <Text size={15} color={colors.textSecondary}>
              {record.time} · {t(`history.${record.status}`)}
            </Text>
          </View>
        </View>

        <View style={styles.amountRow}>
          <Text weight="bold" size={17} color={colors.orange}>
            {formatDinars(record.fee.amount)}
          </Text>
          <Text size={13} color={colors.orange} style={styles.currency}>
            {t('common.tnd')}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const useStyles = makeStyles((c) => ({
  recap: {
    borderRadius: Radius.lg,
    backgroundColor: c.orange,
    padding: Spacing.four,
    marginBottom: Spacing.five,
  },
  recapTitle: {
    letterSpacing: 0.8,
    marginBottom: Spacing.four,
  },
  recapBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  recapFigures: {
    flex: 1,
    gap: Spacing.one,
  },
  growth: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 96,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.one,
  },
  /** The unit rides high next to the figure, as in every frame. */
  currency: {
    marginTop: 2,
  },
  dayHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  rule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
  },
  dayLabel: {
    letterSpacing: 0.8,
  },
  trip: {
    marginBottom: Spacing.four,
  },
  tripInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    paddingVertical: Spacing.four,
  },
  tripIcon: {
    width: 46,
    height: 46,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripText: {
    flex: 1,
    gap: 2,
  },
  tripMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  end: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.five,
  },
  endRule: {
    width: 72,
    height: 4,
    borderRadius: Radius.pill,
    backgroundColor: c.border,
    marginBottom: Spacing.four,
  },
  endText: {
    textAlign: 'center',
    maxWidth: 260,
  },
}));
