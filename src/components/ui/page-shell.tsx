import { useRouter } from 'expo-router';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLocale } from '@/contexts/locale-context';
import { ThemedStatusBar } from '@/components/ui/themed-status-bar';
import { makeStyles } from '@/hooks/use-themed-styles';
import { useColors } from '@/contexts/theme-context';
import { CircleButton } from '@/components/ui/circle-button';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';

// The navy panel of wallet/clock/receipt doodles the frames share behind every
// secondary page's title. A vector, so the line work stays crisp on any screen.
import PageArt from '../../../assets/images/page-bg.svg';

const ART_RATIO = 308 / 412; // height / width of the source viewBox

type Props = {
  title: string;
  children: React.ReactNode;
  /** Extra bottom room under the sheet content, on top of the safe area. */
  contentBottom?: number;
};

/**
 * The shared chrome of the Settings / FAQs / Delivery History / Wallet frames:
 * a navy doodle header with a circular back button and a centred title, and a
 * white sheet that rises over it with rounded top corners and scrolls.
 *
 * The artwork is laid out on the header only, but the navy behind it fills the
 * whole top of the screen so a tall status bar (or an over-scroll bounce) never
 * exposes a seam.
 */
export function PageShell({ title, children, contentBottom = 0 }: Props) {
  const { t } = useLocale();
  const colors = useColors();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  return (
    <View style={styles.screen}>
      <ThemedStatusBar surface="navy" />

      <View style={styles.art} pointerEvents="none">
        <PageArt width={width} height={width * ART_RATIO} />
      </View>

      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
        <CircleButton
          name="chevron-back"
          accessibilityLabel={t('common.back')}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/delivery'))}
          size={44}
          iconSize={24}
        />
        <Text weight="bold" size={26} color={colors.onNavy} style={styles.title}>
          {title}
        </Text>
      </View>

      <View style={styles.sheet}>
        <ScrollView
          contentContainerStyle={[
            styles.sheetContent,
            { paddingBottom: insets.bottom + Spacing.six + contentBottom },
          ]}
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: {
    flex: 1,
    backgroundColor: c.navyDeep,
  },
  art: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.five,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    // Offsets the 44pt back button so the title centres on the screen, not on
    // the space left over beside it.
    marginRight: 44,
  },
  sheet: {
    flex: 1,
    // The page ground, deliberately NOT `card`: the cards laid on it are
    // `card`, and in dark mode that is the only thing separating them — a drop
    // shadow, which does the job in light mode, is invisible on a dark ground.
    backgroundColor: c.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    overflow: 'hidden',
  },
  sheetContent: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.five,
  },
}));
