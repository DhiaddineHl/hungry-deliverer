import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/icon-button';
import { BottomBar } from '@/components/ui/page';
import { ThemedStatusBar } from '@/components/ui/themed-status-bar';
import { useLocale } from '@/contexts/locale-context';
import { makeStyles, useTheme } from '@/theme';

import FoodPattern from '../../../assets/brand/food-pattern.svg';
import Logo from '../../../assets/brand/logo-hungry.svg';

const LOGO_RATIO = 76 / 232; // height / width of the wordmark
const PATTERN = { width: 520, height: 372 };

type Props = {
  children: ReactNode;
  /** 180 pt header with the small logo — sign-up, where the form needs the room. */
  compact?: boolean;
  /** A white back button over the header. */
  onBack?: () => void;
  /** Pinned actions under the scrolling sheet. */
  bottomBar?: ReactNode;
  /** Drive the first-launch reveal (identification screen only). */
  headerStyle?: StyleProp<AnimatedStyle<ViewStyle>>;
  sheetStyle?: StyleProp<AnimatedStyle<ViewStyle>>;
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * The frame of every screen before the map: a navy header carrying the food
 * pattern and the white wordmark, and a white sheet that overlaps it by 28 pt
 * with rounded top corners. The header is the brand moment; the sheet is
 * plain, so the form is the only thing asking for attention.
 */
export function AuthLayout({
  children,
  compact = false,
  onBack,
  bottomBar,
  headerStyle,
  sheetStyle,
  contentStyle,
}: Props) {
  const { t } = useLocale();
  const { size } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const headerHeight = compact ? size.authHeaderCompact : size.authHeader;
  const logoWidth = compact ? size.authLogoWidthCompact : size.authLogoWidth;

  return (
    <View style={styles.screen}>
      <ThemedStatusBar surface="brand" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}>
          <Animated.View style={[styles.header, { height: headerHeight + insets.top * 0.4 }, headerStyle]}>
            <View
              pointerEvents="none"
              style={[styles.pattern, { top: compact ? -104 : -30 }]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants">
              <FoodPattern width={PATTERN.width} height={PATTERN.height} />
            </View>
            <View style={[styles.logo, { top: (compact ? 66 : 120) + insets.top * 0.4 }]}>
              <Logo width={logoWidth} height={logoWidth * LOGO_RATIO} accessibilityLabel="Hungry" />
            </View>
            {onBack ? (
              <IconButton
                name="back"
                variant="plain"
                accessibilityLabel={t('common.back')}
                onPress={onBack}
                style={[styles.back, { top: insets.top + 6 }]}
              />
            ) : null}
          </Animated.View>

          <Animated.View
            style={[
              styles.sheet,
              { paddingBottom: bottomBar ? 24 : insets.bottom + 24 },
              sheetStyle,
              contentStyle,
            ]}>
            {children}
          </Animated.View>
        </ScrollView>
        {bottomBar ? <BottomBar>{bottomBar}</BottomBar> : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const useStyles = makeStyles((c, t) => ({
  screen: {
    flex: 1,
    // The sheet ground, so an over-scroll below the form stays white; the
    // navy only lives in the header block.
    backgroundColor: c.surface,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: c.brand,
    overflow: 'hidden',
  },
  pattern: {
    ...StyleSheet.absoluteFill,
    left: -65,
    width: PATTERN.width,
    height: PATTERN.height,
  },
  logo: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  back: {
    position: 'absolute',
    left: t.chromePadding,
  },
  sheet: {
    flexGrow: 1,
    marginTop: -t.size.authSheetOverlap,
    backgroundColor: c.surface,
    borderTopLeftRadius: t.radius.sheet,
    borderTopRightRadius: t.radius.sheet,
    paddingTop: 28,
    paddingHorizontal: t.screenPadding,
    gap: 20,
  },
}));
