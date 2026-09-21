import { ActivityIndicator, View } from 'react-native';

import { makeStyles } from '@/hooks/use-themed-styles';
import { useColors } from '@/contexts/theme-context';
import { Text } from '@/components/ui/text';
import { Radius, Shadow, Spacing } from '@/constants/theme';

type Props = {
  label: string;
  /** Teal is used for every "good news" state; navy for Offline. */
  tone?: 'neutral' | 'teal';
  loading?: boolean;
};

/**
 * The white capsule floating at the top-centre of every frame.
 *
 * Deliberately not wrapped in an entering/exiting layout animation: the pill
 * is mounted for the whole life of the map screen (only its label changes), and
 * a `FadeInUp` on it was liable to freeze at its initial `translateY: -25`
 * whenever the screen remounted, leaving the capsule tucked under the status
 * bar with its top clipped.
 */
export function StatusPill({ label, tone = 'neutral', loading = false }: Props) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={styles.pill}>
      {loading ? (
        <ActivityIndicator size="small" color={colors.orange} style={styles.spinner} />
      ) : null}
      <Text weight="semibold" size={17} color={tone === 'teal' ? colors.teal : colors.text}>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.card,
    paddingHorizontal: Spacing.five,
    height: 48,
    borderRadius: Radius.pill,
    ...Shadow.pill,
  },
  spinner: {
    marginRight: Spacing.two,
  },
}));
