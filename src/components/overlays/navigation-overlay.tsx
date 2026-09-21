import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLocale } from '@/contexts/locale-context';
import { makeStyles } from '@/hooks/use-themed-styles';
import { useColors } from '@/contexts/theme-context';
import { Text } from '@/components/ui/text';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { maneuverIcon } from '@/features/navigation/maneuver';
import type { TurnByTurn } from '@/features/navigation/use-turn-by-turn';

/** Rounds to a friendly "200 m" / "1.4 km" the way a maps app would. */
function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.max(0, Math.round(meters / 10) * 10)} m`;
}

function formatDuration(seconds: number): string {
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

type Props = {
  guidance: TurnByTurn;
  onExit: () => void;
};

/** In-app turn-by-turn HUD: manoeuvre banner up top, trip summary + exit below. */
export function NavigationOverlay({ guidance, onExit }: Props) {
  const { t } = useLocale();
  const colors = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  return (
    <>
      <Animated.View
        entering={FadeIn}
        exiting={FadeOut}
        style={[styles.banner, { paddingTop: insets.top + Spacing.three }]}>
        <View style={styles.maneuver}>
          <Ionicons name={maneuverIcon(guidance.maneuver)} size={36} color={colors.onNavy} />
          {!guidance.arrived ? (
            <Text weight="bold" size={24} color={colors.onNavy}>
              {formatDistance(guidance.distanceToManeuver)}
            </Text>
          ) : null}
        </View>
        <Text weight="semibold" size={17} color={colors.onNavy} style={styles.instruction}>
          {guidance.instruction}
        </Text>
      </Animated.View>

      <Animated.View
        entering={FadeIn}
        exiting={FadeOut}
        style={[styles.footer, { paddingBottom: insets.bottom + Spacing.four }]}>
        <View style={styles.summary}>
          <Text weight="bold" size={20} color={colors.text}>
            {formatDuration(guidance.remainingSeconds)}
          </Text>
          <Text weight="medium" size={14} color={colors.textSecondary}>
            {formatDistance(guidance.remainingMeters)} remaining
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('delivery.endNavigation')}
          onPress={onExit}
          style={({ pressed }) => [styles.exit, pressed && styles.pressed]}>
          <Ionicons name="close" size={22} color={colors.onNavy} />
          <Text weight="semibold" size={15} color={colors.onNavy}>
            End
          </Text>
        </Pressable>
      </Animated.View>
    </>
  );
}

const useStyles = makeStyles((c) => ({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: c.navy,
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.four,
    borderBottomLeftRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
    ...Shadow.card,
  },
  maneuver: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  instruction: {
    marginTop: Spacing.two,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.card,
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.four,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    ...Shadow.card,
  },
  summary: {
    gap: 2,
  },
  exit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: c.pin,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Radius.pill,
    ...Shadow.pill,
  },
  pressed: {
    opacity: 0.85,
  },
}));
