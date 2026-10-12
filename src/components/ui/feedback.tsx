import { useEffect, type ReactNode } from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { TextLink } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon, makeStyles, useTheme, type IconName } from '@/theme';

/**
 * A loading block in the exact shape of what it replaces (text bars 12–18 pt,
 * images at their real radius). Pulses 0.6 ↔ 1; static under Reduce Motion.
 */
export function Skeleton({
  width = '100%',
  height = 14,
  radius = 6,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, motion } = useTheme();
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    pulse.set(withRepeat(withTiming(0.6, { duration: motion.skeletonPulseMs / 2 }), -1, true));
    return () => cancelAnimation(pulse);
  }, [reduceMotion, pulse, motion.skeletonPulseMs]);

  const animated = useAnimatedStyle(() => ({ opacity: pulse.get() }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.skeleton }, animated, style]}
    />
  );
}

/** Red-soft banner above the content a request failed for — says what to do next. */
export function ErrorBanner({
  title,
  message,
  actionLabel,
  onAction,
  style,
}: {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  return (
    <View style={[styles.banner, styles.error, style]} accessibilityLiveRegion="polite">
      <Icon name="error" size="row" color="danger" />
      <View style={styles.bannerText}>
        {title ? (
          <Text variant="chip" color="danger" style={styles.errorTitle}>
            {title}
          </Text>
        ) : null}
        <Text variant="meta">{message}</Text>
        {actionLabel && onAction ? (
          <TextLink label={actionLabel} onPress={onAction} style={styles.bannerAction} />
        ) : null}
      </View>
    </View>
  );
}

/** Neutral note — information, not a problem. */
export function InfoNote({ children, icon = 'info', style }: { children: string; icon?: IconName; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles();
  return (
    <View style={[styles.banner, styles.info, style]}>
      <Icon name={icon} size="row" />
      <Text variant="meta" style={styles.bannerText}>
        {children}
      </Text>
    </View>
  );
}

/** Green-soft single line — "You're at the store". */
export function SuccessLine({ children }: { children: string }) {
  const styles = useStyles();
  return (
    <View style={styles.successLine}>
      <Icon name="success" size="row" color="success" />
      <Text variant="chip" color="success" style={styles.bannerText}>
        {children}
      </Text>
    </View>
  );
}

/**
 * Empty / error / success state: 72 pt well, heading, body (max 280), then one
 * or two full-width actions.
 */
export function StateView({
  icon,
  tone = 'neutral',
  title,
  body,
  children,
  style,
}: {
  icon: IconName;
  tone?: 'neutral' | 'primary' | 'success';
  title: string;
  body?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  return (
    <View style={[styles.state, style]}>
      <View style={[styles.stateWell, styles[`well_${tone}`]]}>
        <Icon name={icon} size="state" color={tone === 'success' ? 'success' : tone === 'primary' ? 'primary' : 'ink'} />
      </View>
      <Text variant="heading" align="center" accessibilityRole="header">
        {title}
      </Text>
      {body ? (
        <Text variant="description" color="inkMuted" align="center" style={styles.stateBody}>
          {body}
        </Text>
      ) : null}
      {children ? <View style={styles.stateActions}>{children}</View> : null}
    </View>
  );
}

const useStyles = makeStyles((c, t) => ({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: t.radius.field,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  error: {
    backgroundColor: c.dangerSoft,
  },
  info: {
    backgroundColor: c.surfaceMuted,
  },
  bannerText: {
    flex: 1,
    gap: 2,
  },
  errorTitle: {
    fontFamily: t.typography.itemTitle.fontFamily,
    lineHeight: 20,
  },
  bannerAction: {
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  successLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: t.radius.field,
    backgroundColor: c.successSoft,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  state: {
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
  },
  stateWell: {
    width: t.size.stateWell,
    height: t.size.stateWell,
    borderRadius: t.size.stateWell / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  well_neutral: { backgroundColor: c.surfaceSunken },
  well_primary: { backgroundColor: c.primarySoft },
  well_success: { backgroundColor: c.successSoft },
  stateBody: {
    maxWidth: 280,
    lineHeight: 21,
  },
  stateActions: {
    alignSelf: 'stretch',
    gap: 12,
    marginTop: 6,
  },
}));
