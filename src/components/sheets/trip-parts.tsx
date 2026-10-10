import {
  Linking,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Divider, IconWell } from '@/components/ui/content';
import { IconButton } from '@/components/ui/icon-button';
import { Checkbox } from '@/components/ui/selection';
import { Text } from '@/components/ui/text';
import { useLocale } from '@/contexts/locale-context';
import { formatMoney } from '@/features/format';
import type { OrderItem } from '@/features/session/types';
import { Icon, makeStyles, type IconName } from '@/theme';

/**
 * The map's bottom sheet: white, top radius 28, grabber, 10×24 padding and
 * the home-indicator area inside it. Reports its height so the map can frame
 * routes above it and the floating controls can ride its top edge. It never
 * covers more than 70 % of the screen; taller content scrolls inside it.
 */
export function MapSheet({
  children,
  onLayout,
  gap = 14,
  onGrabberPress,
  grabberLabel,
}: {
  children: React.ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
  gap?: number;
  /** Makes the grabber a button (collapse / expand). */
  onGrabberPress?: () => void;
  grabberLabel?: string;
}) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return (
    <Animated.View
      layout={LinearTransition.duration(220)}
      onLayout={onLayout}
      style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
      {onGrabberPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={grabberLabel}
          onPress={onGrabberPress}
          hitSlop={{ top: 10, bottom: 10, left: 60, right: 60 }}
          style={styles.grabberHit}>
          <View style={styles.grabber} />
        </Pressable>
      ) : (
        <View style={styles.grabberHit}>
          <View style={styles.grabber} />
        </View>
      )}
      <ScrollView
        style={{ maxHeight: height * 0.7 }}
        contentContainerStyle={{ gap }}
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </Animated.View>
  );
}

/** `Step 1 of 2 · Pickup` + status on the right, over two progress segments. */
export function StepHeader({ step, status }: { step: 1 | 2; status: string }) {
  const { t } = useLocale();
  const styles = useStyles();
  return (
    <View style={styles.stepHeader}>
      <View style={styles.stepRow}>
        <Text variant="label" color="inkMuted">
          {step === 1 ? t('delivery.stepPickup') : t('delivery.stepDropoff')}
        </Text>
        <Text variant="metaStrong">{status}</Text>
      </View>
      <View style={styles.segments} accessibilityElementsHidden>
        <View style={[styles.segment, styles.segmentOn]} />
        <View style={[styles.segment, step === 2 && styles.segmentOn]} />
      </View>
    </View>
  );
}

/** 44 well + name, address and detail, with a navy call button on the right. */
export function ContactBlock({
  kind,
  name,
  address,
  detail,
  phone,
}: {
  kind: 'store' | 'customer';
  name: string;
  address: string;
  detail?: string;
  phone: string;
}) {
  const { t } = useLocale();
  const styles = useStyles();
  return (
    <View style={styles.contact}>
      <IconWell icon={kind} size={44} iconSize="field" />
      <View style={styles.contactText}>
        <Text variant="contactName" numberOfLines={2}>
          {name}
        </Text>
        <Text variant="meta" color="inkMuted" style={styles.regular}>
          {address}
        </Text>
        {detail ? (
          <Text variant="caption" color="inkMuted" style={styles.semibold}>
            {detail}
          </Text>
        ) : null}
      </View>
      <IconButton
        name="phone"
        variant="filled"
        // The offer feed carries no numbers yet; the button says so rather than
        // dialling nothing.
        disabled={!phone}
        accessibilityLabel={phone ? t('delivery.call', { name }) : t('delivery.noPhone', { name })}
        onPress={() => Linking.openURL(`tel:${phone}`)}
        style={!phone ? styles.callDisabled : null}
      />
    </View>
  );
}

/**
 * `Order #2043 · 3 items` with a chevron; expanded it lists `1× item` lines.
 * In checklist mode (at the store) each line carries a checkbox the rider
 * ticks while checking the bag.
 */
export function OrderSummary({
  reference,
  items,
  expanded,
  onToggle,
  checked,
  onToggleItem,
  style,
}: {
  reference: string;
  items: OrderItem[];
  expanded: boolean;
  onToggle?: () => void;
  /** Present → checklist mode. */
  checked?: ReadonlySet<string>;
  onToggleItem?: (id: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useLocale();
  const styles = useStyles();
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const countLabel = count === 1 ? t('common.itemsOne') : t('common.itemsOther', { count });
  const checklist = checked !== undefined;

  const header = (
    <View style={styles.summaryHeader}>
      <Text variant="itemTitle" style={styles.flex}>
        {t('delivery.orderNumber', { number: reference })}
        <Text variant="itemTitle" color="inkMuted" style={styles.medium}>
          {` · ${countLabel}`}
        </Text>
      </Text>
      {onToggle ? <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size="row" /> : null}
    </View>
  );

  return (
    <View style={[styles.summary, style]}>
      {onToggle ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={`${t('delivery.orderNumber', { number: reference })}, ${countLabel}`}
          onPress={onToggle}
          hitSlop={8}>
          {header}
        </Pressable>
      ) : (
        header
      )}
      {expanded && items.length > 0 ? (
        <>
          <Divider />
          <View style={checklist ? styles.checkLines : styles.lines}>
            {items.map((item) => {
              const line = (
                <Text variant="itemLine" style={styles.flex}>
                  <Text variant="itemLine" style={styles.bold}>
                    {`${item.quantity}×  `}
                  </Text>
                  {item.name}
                </Text>
              );
              if (!checklist) return <View key={item.id}>{line}</View>;
              const isChecked = checked.has(item.id);
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isChecked }}
                  accessibilityLabel={`${item.quantity}× ${item.name}`}
                  onPress={() => onToggleItem?.(item.id)}
                  hitSlop={6}
                  style={styles.checkLine}>
                  <Checkbox checked={isChecked} />
                  {line}
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );
}

/** Orange-soft row: what the rider must take from the customer. */
export function CashToCollect({ amount }: { amount: number }) {
  const { t } = useLocale();
  const styles = useStyles();
  return (
    <View style={styles.cash}>
      <Icon name="cash" />
      <Text variant="chip" style={[styles.flex, styles.cashLabel]}>
        {t('delivery.collectCash')}
      </Text>
      <Text variant="amount">{formatMoney(amount)}</Text>
    </View>
  );
}

/** A 32 well + caption / name / address — one stop on the offer card. */
export function StopRow({
  icon,
  caption,
  name,
  address,
}: {
  icon: IconName;
  caption: string;
  name: string;
  address?: string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.stop}>
      <IconWell icon={icon} size={32} radius={10} iconSize="small" />
      <View style={styles.flex}>
        <Text variant="caption" color="inkMuted" style={styles.regular}>
          {caption}
        </Text>
        <Text variant="itemTitle" numberOfLines={1}>
          {name}
        </Text>
        {address ? (
          <Text variant="meta" color="inkMuted" numberOfLines={2} style={styles.regular}>
            {address}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c, t) => ({
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: t.radius.sheet,
    borderTopRightRadius: t.radius.sheet,
    paddingTop: 10,
    paddingHorizontal: t.screenPadding,
    ...t.shadow.sheet,
  },
  grabberHit: {
    alignSelf: 'center',
    paddingBottom: 14,
  },
  grabber: {
    width: t.size.sheetGrabber.w,
    height: t.size.sheetGrabber.h,
    borderRadius: 2,
    backgroundColor: c.outline,
  },
  flex: {
    flex: 1,
  },
  regular: {
    fontFamily: t.typography.description.fontFamily,
  },
  medium: {
    fontFamily: t.typography.meta.fontFamily,
  },
  semibold: {
    fontFamily: t.typography.label.fontFamily,
  },
  bold: {
    fontFamily: t.typography.itemTitle.fontFamily,
  },
  stepHeader: {
    gap: 8,
  },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
  },
  segments: {
    flexDirection: 'row',
    gap: 4,
  },
  segment: {
    flex: 1,
    height: t.size.progressSegment,
    borderRadius: 2,
    backgroundColor: c.surfaceSunken,
  },
  segmentOn: {
    backgroundColor: c.primary,
  },
  contact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  contactText: {
    flex: 1,
    gap: 2,
  },
  callDisabled: {
    opacity: 0.35,
  },
  summary: {
    borderWidth: 1,
    borderColor: c.divider,
    borderRadius: t.radius.thumb,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lines: {
    gap: 6,
  },
  checkLines: {
    gap: 10,
  },
  checkLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cash: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: t.radius.field,
    backgroundColor: c.primarySoft,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  cashLabel: {
    lineHeight: 20,
  },
  stop: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
  },
}));
