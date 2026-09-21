import { View } from 'react-native';

import { makeStyles } from '@/hooks/use-themed-styles';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import type { OrderItem } from '@/features/session/types';

/** The bordered box listing "1x Pizza au Thon" and friends. */
export function OrderItemsList({ items }: { items: OrderItem[] }) {
  const styles = useStyles();
  return (
    <View style={styles.box}>
      {items.map((item) => (
        <Text key={item.id} size={15} style={styles.item}>
          {item.quantity}x {item.name}
        </Text>
      ))}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  box: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  item: {
    lineHeight: 22,
  },
}));
