import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SecondaryButton } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useLocale } from '@/contexts/locale-context';
import { formatDuration } from '@/features/format';
import { maneuverIcon } from '@/features/navigation/maneuver';
import type { TurnByTurn } from '@/features/navigation/use-turn-by-turn';
import { Icon, makeStyles } from '@/theme';

/** Rounds to a friendly "200 m" / "1,4 km" the way a maps app would. */
function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
  return `${Math.max(0, Math.round(meters / 10) * 10)} m`;
}

type Props = {
  guidance: TurnByTurn;
  onExit: () => void;
};

/**
 * In-app turn-by-turn HUD. The manoeuvre card floats under the status bar in
 * the map's own chrome style (white, floating shadow); the trip summary and the
 * End button sit in a sheet at the bottom.
 */
export function NavigationOverlay({ guidance, onExit }: Props) {
  const { t } = useLocale();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  return (
    <>
      <Animated.View entering={FadeIn} exiting={FadeOut} style={[styles.banner, { top: insets.top + 6 }]}>
        <View style={styles.maneuverWell}>
          <Icon name={maneuverIcon(guidance.maneuver)} size={28} color="onInk" />
        </View>
        <View style={styles.bannerText}>
          {!guidance.arrived ? (
            <Text variant="heading" tabular>
              {formatDistance(guidance.distanceToManeuver)}
            </Text>
          ) : null}
          <Text variant="itemLabel" color="inkMuted" numberOfLines={2}>
            {guidance.instruction}
          </Text>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeIn}
        exiting={FadeOut}
        style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.summary}>
          <Text variant="heading" tabular>
            {formatDuration(guidance.remainingSeconds / 60)}
          </Text>
          <Text variant="meta" color="inkMuted" tabular>
            {t('delivery.remaining', { distance: formatDistance(guidance.remainingMeters) })}
          </Text>
        </View>
        <SecondaryButton
          label={t('delivery.end')}
          icon="close"
          accessibilityLabel={t('delivery.endNavigation')}
          onPress={onExit}
          style={styles.exit}
        />
      </Animated.View>
    </>
  );
}

const useStyles = makeStyles((c, t) => ({
  banner: {
    position: 'absolute',
    left: t.chromePadding,
    right: t.chromePadding,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: c.surface,
    borderRadius: t.radius.card,
    padding: 14,
    ...t.shadow.floatingButton,
  },
  maneuverWell: {
    width: 52,
    height: 52,
    borderRadius: t.radius.field,
    backgroundColor: c.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    flex: 1,
    gap: 2,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    backgroundColor: c.surface,
    paddingHorizontal: t.screenPadding,
    paddingTop: 20,
    borderTopLeftRadius: t.radius.sheet,
    borderTopRightRadius: t.radius.sheet,
    ...t.shadow.sheet,
  },
  summary: {
    gap: 2,
  },
  exit: {
    minWidth: 120,
  },
}));
