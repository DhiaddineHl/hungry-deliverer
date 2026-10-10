import { View } from 'react-native';

import { StatusDot } from '@/components/ui/content';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { makeStyles, type ColorToken } from '@/theme';

type Props = {
  label: string;
  /** A coloured 8 pt dot, or the spinner while searching. */
  lead: ColorToken | 'spinner';
};

/**
 * The white pill at the top-centre of the map: where the session stands, in
 * one line. Grey dot offline, spinner while searching, orange while a trip is
 * under way, green when something is ready.
 *
 * Not wrapped in an entering animation: it stays mounted for the life of the
 * map and only its content changes.
 */
export function StatusPill({ label, lead }: Props) {
  const styles = useStyles();
  return (
    <View style={styles.pill} accessibilityRole="text" accessibilityLiveRegion="polite">
      {lead === 'spinner' ? <Spinner size={14} /> : <StatusDot color={lead} />}
      <Text variant="pill" numberOfLines={1} style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((c, t) => ({
  pill: {
    flexShrink: 1,
    minHeight: t.size.statusPill,
    borderRadius: t.size.statusPill / 2,
    backgroundColor: c.surface,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...t.shadow.floatingButton,
  },
  label: {
    flexShrink: 1,
  },
}));
