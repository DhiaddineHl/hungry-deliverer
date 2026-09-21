import { Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useLocale } from '@/contexts/locale-context';
import { useColors } from '@/contexts/theme-context';
import { makeStyles } from '@/hooks/use-themed-styles';
import { Text } from '@/components/ui/text';
import { Radius, Shadow, Spacing } from '@/constants/theme';

/** Ends the shift — sits just under the "Finding orders" pill. */
export function StopSessionButton({ onPress }: { onPress: () => void }) {
  const { t } = useLocale();
  const colors = useColors();
  const styles = useStyles();
  return (
    <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('delivery.stopSession')}
        onPress={onPress}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Text weight="semibold" size={16} color={colors.danger}>
          {t('delivery.stopSession')}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const useStyles = makeStyles((c) => ({
  button: {
    alignSelf: 'center',
    backgroundColor: c.card,
    paddingHorizontal: Spacing.five,
    height: 44,
    justifyContent: 'center',
    borderRadius: Radius.pill,
    ...Shadow.pill,
  },
  pressed: {
    opacity: 0.8,
  },
}));
