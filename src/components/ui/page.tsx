import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { ThemedStatusBar } from '@/components/ui/themed-status-bar';
import { useLocale } from '@/contexts/locale-context';
import { makeStyles } from '@/theme';

/**
 * Outlined back button + title (+ optional trailing link). Inner pages are
 * white — no navy headers (DRIVER_APP.md §1).
 */
export function TopBar({
  title,
  trailing,
  onBack,
  divided,
}: {
  title: string;
  trailing?: ReactNode;
  onBack?: () => void;
  /** The 1 pt line a scrolled page draws under its bar. */
  divided?: boolean;
}) {
  const { t } = useLocale();
  const styles = useStyles();
  const router = useRouter();
  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/delivery')));
  return (
    <View style={[styles.topBar, divided && styles.topBarDivided]}>
      <View style={styles.topBarRow}>
        <IconButton name="back" accessibilityLabel={t('common.back')} onPress={back} />
        <Text variant="sectionTitle" numberOfLines={1} style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {trailing}
      </View>
    </View>
  );
}

/** Pinned bottom action area: 1 pt top divider, 12×24 padding, home-indicator room. */
export function BottomBar({ children }: { children: ReactNode }) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
      <View style={styles.bottomRow}>{children}</View>
    </View>
  );
}

type PageProps = {
  title: string;
  trailing?: ReactNode;
  children: ReactNode;
  /** Pinned actions; the scroll content gets room for them. */
  bottomBar?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * The shell of every pushed page (Earnings, History, Help, Settings…): white
 * ground, TopBar, scrolling content with the 24 pt gutter, optional BottomBar.
 * The divider under the bar appears once the content has scrolled under it.
 */
export function Page({ title, trailing, children, bottomBar, contentStyle }: PageProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [scrolled, setScrolled] = useState(false);

  // Only crossing the threshold re-renders, not every scroll frame.
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = event.nativeEvent.contentOffset.y > 4;
    if (next !== scrolled) setScrolled(next);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ThemedStatusBar />
      <TopBar title={title} trailing={trailing} divided={scrolled} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          onScroll={onScroll}
          scrollEventThrottle={32}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            !bottomBar && { paddingBottom: insets.bottom + 32 },
            contentStyle,
          ]}>
          {children}
        </ScrollView>
        {bottomBar ? <BottomBar>{bottomBar}</BottomBar> : null}
      </KeyboardAvoidingView>
    </View>
  );
}

/** Section header row: 18/700 title left, optional link or figure right. */
export function SectionHeader({ title, trailing, style }: { title: string; trailing?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles();
  return (
    <View style={[styles.sectionHeader, style]}>
      <Text variant="sectionTitle" accessibilityRole="header" style={styles.flex}>
        {title}
      </Text>
      {trailing}
    </View>
  );
}

const useStyles = makeStyles((c, t) => ({
  screen: {
    flex: 1,
    backgroundColor: c.background,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  topBarDivided: {
    borderBottomColor: c.divider,
  },
  topBarRow: {
    marginHorizontal: t.chromePadding,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    flex: 1,
  },
  content: {
    paddingHorizontal: t.screenPadding,
    paddingTop: 4,
    paddingBottom: 32,
  },
  bottomBar: {
    backgroundColor: c.surface,
    borderTopWidth: 1,
    borderTopColor: c.divider,
    paddingTop: 12,
    paddingHorizontal: t.screenPadding,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
}));
