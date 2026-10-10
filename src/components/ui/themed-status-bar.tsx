import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/theme';

type Props = {
  /**
   * What is behind the status bar on this screen.
   * 'theme' — the page's own background, which flips with the palette.
   * 'brand' — the navy auth header or pickup-code screen, which does not.
   */
  surface?: 'theme' | 'brand';
};

/**
 * The status bar, inverted against whatever it sits on. Resolved from the app
 * theme rather than expo-status-bar's "auto", which reads the system scheme and
 * would paint dark icons over a dark background when the app is pinned to Dark.
 */
export function ThemedStatusBar({ surface = 'theme' }: Props) {
  const { isDark } = useTheme();
  if (surface === 'brand') return <StatusBar style="light" />;
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}
