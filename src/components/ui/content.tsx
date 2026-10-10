import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/text';
import { Icon, makeStyles, useColors, type ColorToken, type IconName } from '@/theme';

/** 1 pt divider-bordered container. `radius` 16 for rider cards, 20 for list groups. */
export function Card({
  children,
  radius = 'card',
  style,
}: {
  children: ReactNode;
  radius?: 'card' | 'thumb';
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  return <View style={[styles.card, radius === 'thumb' && styles.cardSmall, style]}>{children}</View>;
}

/** 1 pt separator. `inset` starts it past a row's icon well. */
export function Divider({ inset = 0, style }: { inset?: number; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles();
  return <View style={[styles.divider, { marginLeft: inset }, style]} />;
}

/** 11/600 uppercase list-group header — the only uppercase text in the app. */
export function Overline({ children, danger, style }: { children: string; danger?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <Text variant="overline" color={danger ? 'danger' : 'inkMuted'}>
        {children}
      </Text>
    </View>
  );
}

/** Rounded square behind an icon. Neutral by default; tinted for status. */
export function IconWell({
  icon,
  tone = 'neutral',
  size = 36,
  radius,
  iconSize = 'row',
}: {
  icon: IconName;
  tone?: 'neutral' | 'primary' | 'success' | 'danger' | 'ink';
  size?: number;
  radius?: number;
  iconSize?: 'inline' | 'small' | 'row' | 'field' | 'state';
}) {
  const styles = useStyles();
  const iconColor: ColorToken =
    tone === 'primary' ? 'primary' : tone === 'success' ? 'success' : tone === 'danger' ? 'danger' : tone === 'ink' ? 'onInk' : 'ink';
  return (
    <View
      style={[
        styles.well,
        styles[`well_${tone}`],
        { width: size, height: size, borderRadius: radius ?? (size >= 44 ? 14 : 12) },
      ]}>
      <Icon name={icon} size={iconSize} color={iconColor} />
    </View>
  );
}

/** A Card of ListRows with inset dividers between them (never after the last). */
export function ListGroup({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <Card style={style}>
      {rows.map((row, index) => (
        <Fragment key={index}>
          {index > 0 ? <Divider inset={66} /> : null}
          {row}
        </Fragment>
      ))}
    </Card>
  );
}

type ListRowProps = {
  icon: IconName;
  label: string;
  /** Small caption above the label (Settings: "Full name" over "Test Test"). */
  caption?: string;
  trailing?: ReactNode;
  /** Draws the chevron and makes the row pressable. */
  onPress?: () => void;
  destructive?: boolean;
  accessibilityHint?: string;
};

/** Min 60 pt row: 36 well, label (with optional caption above), trailing slot. */
export function ListRow({ icon, label, caption, trailing, onPress, destructive, accessibilityHint }: ListRowProps) {
  const styles = useStyles();
  const body = (
    <>
      <IconWell icon={icon} tone={destructive ? 'danger' : 'neutral'} />
      <View style={styles.rowText}>
        {caption ? (
          <Text variant="caption" color="inkMuted" style={styles.captionText}>
            {caption}
          </Text>
        ) : null}
        <Text variant="itemLabel" color={destructive ? 'danger' : 'ink'} numberOfLines={1}>
          {label}
        </Text>
      </View>
      {trailing ?? (onPress && !destructive ? <Icon name="chevronRight" size="row" color="inkMuted" /> : null)}
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.row} accessibilityLabel={caption ? `${caption}: ${label}` : label}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={caption ? `${caption}: ${label}` : label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {body}
    </Pressable>
  );
}

/** 12/700 tag, radius 6. `status` is orange-soft; `neutral` is sunken. */
export function Badge({ label, tone = 'status' }: { label: string; tone?: 'status' | 'neutral' }) {
  const styles = useStyles();
  return (
    <View style={[styles.badge, tone === 'neutral' && styles.badgeNeutral]}>
      <Text variant="badge" color={tone === 'neutral' ? 'inkMuted' : 'ink'}>
        {label}
      </Text>
    </View>
  );
}

/** 8 pt status dot. */
export function StatusDot({ color }: { color: ColorToken }) {
  const styles = useStyles();
  const colors = useColors();
  return <View style={[styles.dot, { backgroundColor: colors[color] }]} />;
}

/** 56 pt orange-soft circle with initials. */
export function Avatar({ initials }: { initials: string }) {
  const styles = useStyles();
  return (
    <View style={styles.avatar}>
      <Text variant="sectionTitle">{initials}</Text>
    </View>
  );
}

const useStyles = makeStyles((c, t) => ({
  card: {
    borderWidth: 1,
    borderColor: c.divider,
    borderRadius: t.radius.card,
    overflow: 'hidden',
    backgroundColor: c.surface,
  },
  cardSmall: {
    borderRadius: t.radius.thumb,
  },
  divider: {
    height: 1,
    backgroundColor: c.divider,
  },
  well: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  well_neutral: { backgroundColor: c.surfaceSunken },
  well_primary: { backgroundColor: c.primarySoft },
  well_success: { backgroundColor: c.successSoft },
  well_danger: { backgroundColor: c.dangerSoft },
  well_ink: { backgroundColor: c.ink },
  row: {
    minHeight: t.size.listRow,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  captionText: {
    fontFamily: t.typography.description.fontFamily,
  },
  pressed: {
    backgroundColor: c.surfaceMuted,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: t.radius.badge,
    paddingVertical: 3,
    paddingHorizontal: 7,
    backgroundColor: c.primarySoft,
  },
  badgeNeutral: {
    backgroundColor: c.surfaceSunken,
  },
  dot: {
    width: t.size.statusDot,
    height: t.size.statusDot,
    borderRadius: t.size.statusDot / 2,
  },
  avatar: {
    width: t.size.avatar,
    height: t.size.avatar,
    borderRadius: t.size.avatar / 2,
    backgroundColor: c.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
