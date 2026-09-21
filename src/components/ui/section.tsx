import { StyleSheet, View, type ViewStyle } from 'react-native';

import { makeStyles } from '@/hooks/use-themed-styles';
import { useColors } from '@/contexts/theme-context';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';

/** The orange section label above each group of cards on the Settings frame. */
export function SectionTitle({ children }: { children: string }) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <Text weight="bold" size={20} color={colors.orange} style={styles.sectionTitle}>
      {children}
    </Text>
  );
}

/** The white rounded panel the frames group rows into. */
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const styles = useStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Hairline between two rows of the same card — inset past the row's icon. */
export function RowDivider({ inset = 0 }: { inset?: number }) {
  const styles = useStyles();
  return <View style={[styles.divider, { marginLeft: inset }]} />;
}

const useStyles = makeStyles((c) => ({
  sectionTitle: {
    marginBottom: Spacing.three,
  },
  card: {
    backgroundColor: c.card,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.four,
    // A softer, wider shadow than Shadow.card: these panels sit on white, so
    // the elevation has to read without a visible edge.
    shadowColor: '#0B2B3C',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
  },
}));
