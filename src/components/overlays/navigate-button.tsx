import { Pressable } from 'react-native';

import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { useLocale } from '@/contexts/locale-context';
import { Icon, makeStyles } from '@/theme';

/** 44 pt navy pill that starts in-app turn-by-turn guidance for the current leg. */
export function NavigateButton({ onPress, loading = false }: { onPress: () => void; loading?: boolean }) {
  const { t } = useLocale();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('delivery.navigate')}
      accessibilityState={{ disabled: loading, busy: loading }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}>
      {loading ? <Spinner tone="onInk" /> : <Icon name="navigate" size="row" color="onInk" />}
      <Text variant="pill" color="onInk">
        {loading ? t('delivery.starting') : t('delivery.navigate')}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((c, t) => ({
  pill: {
    height: t.size.iconButton,
    borderRadius: t.size.iconButton / 2,
    backgroundColor: c.ink,
    paddingLeft: 12,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...t.shadow.floatingButton,
  },
  pressed: {
    opacity: t.opacity.pressed,
    transform: [{ scale: t.motion.pressScale }],
  },
}));
