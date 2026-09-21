import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/contexts/theme-context';

type Props = {
  /**
   * What is actually behind the status bar on this screen.
   *
   * 'theme' — the page's own background, which flips with the palette.
   * 'navy'  — the fixed navy header or auth backdrop, which does not.
   */
  surface?: 'theme' | 'navy';
};

/**
 * The status bar, inverted against whatever it sits on.
 *
 * Driven by the app's theme rather than expo-status-bar's own `"auto"`, which
 * reads the *system* scheme. That distinction matters the moment someone pins
 * the app to Dark while their phone is in Light: `"auto"` would paint dark
 * icons over our dark background, and they would vanish. Resolving it from
 * `useTheme` means the bar follows the palette actually on screen, however that
 * palette was chosen.
 *
 * A navy surface is the same navy in both palettes, so it always takes light
 * icons — inverting *that* with the theme is what would break it.
 */
export function ThemedStatusBar({ surface = 'theme' }: Props) {
  const { isDark } = useTheme();

  if (surface === 'navy') return <StatusBar style="light" />;

  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}
