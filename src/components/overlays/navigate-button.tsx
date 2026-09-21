import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { useLocale } from '@/contexts/locale-context';
import { makeStyles } from '@/hooks/use-themed-styles';
import { useColors } from '@/contexts/theme-context';
import { Text } from '@/components/ui/text';
import { Radius, Shadow, Spacing } from '@/constants/theme';

/** Navy "Navigate" pill that starts in-app turn-by-turn guidance for the leg. */
export function NavigateButton({
  onPress,
  loading = false,
}: {
  onPress: () => void;
  loading?: boolean;
}) {
  const { t } = useLocale();
  const colors = useColors();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('delivery.navigate')}
      accessibilityState={{ disabled: loading }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <View style={styles.icon}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.navy} />
        ) : (
          <Ionicons name="navigate" size={14} color={colors.navy} />
        )}
      </View>
      <Text weight="semibold" size={16} color={colors.onNavy}>
        {loading ? t('delivery.starting') : t('delivery.navigate')}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  button: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: c.navy,
    paddingLeft: Spacing.two,
    paddingRight: Spacing.five,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    ...Shadow.pill,
  },
  icon: {
    width: 30,
    height: 30,
    borderRadius: Radius.pill,
    backgroundColor: c.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
}));
