// Hungry Rider — theme object, provider and hooks.
//
//   const { colors, typography, radius, size, shadow } = useTheme();
//   const useStyles = makeStyles((c, t) => ({ card: { backgroundColor: c.surface, borderRadius: t.radius.card } }));
//
// Components never write a hex value, font size or radius inline; every value
// comes from here (DESIGN_SYSTEM.md §13).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  useColorScheme,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { darkColors, lightColors, type Colors } from './colors';
import { typography } from './typography';

export const space = { 2: 2, 4: 4, 6: 6, 8: 8, 10: 10, 12: 12, 14: 14, 16: 16, 20: 20, 22: 22, 24: 24, 28: 28, 32: 32 } as const;

export const radius = {
  badge: 6,
  segmentInner: 9,
  control: 12,
  field: 14,
  thumb: 16,
  card: 20,
  sheet: 28,
  pill: 999,
} as const;

export const size = {
  minTouch: 44,
  iconButton: 44,
  input: 52,
  button: 52,
  chip: 40,
  segment: 44,
  segmentSmall: 32,
  checkbox: 22,
  toggle: { w: 44, h: 26, knob: 22 },
  otpBox: 56,
  emailChip: 48,
  listRow: 60,
  drawerRow: 56,
  homeIndicator: 34,
  sheetGrabber: { w: 36, h: 4 },
  iconWell: 36,
  contactWell: 44,
  stopWell: 32,
  stateWell: 72,
  avatar: 56,
  progressSegment: 4,
  statusDot: 8,
  statusPill: 44,
  slideToConfirm: { h: 56, handle: 48, inset: 4 },
  mapMarker: 36,
  riderDot: { halo: 64, outer: 22, inner: 14 },
  vehicleTile: 88,
  drawerWidth: 312,
  authHeader: 300,
  authHeaderCompact: 180,
  authLogoWidth: 176,
  authLogoWidthCompact: 120,
  authSheetOverlap: 28,
  chartHeight: 120,
  icon: { clear: 12, inline: 14, small: 16, row: 18, field: 20, nav: 22, state: 30 },
} as const;

export const screenPadding = 24;
export const chromePadding = 16;

const sh = (opacity: number, y: number, r: number, elevation: number) => ({
  shadowColor: '#003049',
  shadowOpacity: opacity,
  shadowOffset: { width: 0, height: y },
  shadowRadius: r,
  elevation,
});

export const shadow = {
  segmentSelected: sh(0.14, 1, 2, 1),
  floatingButton: sh(0.18, 2, 8, 3), // map chrome, markers, locate, navigate pill
  sheet: sh(0.12, -4, 24, 8),
  toast: sh(0.45, 8, 24, 6),
} as const;

/**
 * The focus halo on inputs: a blurred glow that fades out from the field's
 * edge. `boxShadow` (New Architecture) rather than a padded backing view —
 * a view has a hard edge, a blur does not.
 */
export const focusGlow = (color: string) => `0px 0px 10px 2px ${color}`;

export const opacity = { lockedInput: 0.6, pageBusy: 0.55, pressed: 0.85 } as const;

export const motion = {
  toastMs: 4000,
  skeletonPulseMs: 1200,
  spinnerMs: 800,
  pressScale: 0.98,
  /** Fraction of the track the slide-to-confirm handle must cross. */
  slideThreshold: 0.85,
} as const;

export type ColorSchemeName = 'light' | 'dark';

export type Theme = {
  scheme: ColorSchemeName;
  colors: Colors;
  typography: typeof typography;
  space: typeof space;
  radius: typeof radius;
  size: typeof size;
  shadow: typeof shadow;
  opacity: typeof opacity;
  motion: typeof motion;
  screenPadding: number;
  chromePadding: number;
};

const base = { typography, space, radius, size, shadow, opacity, motion, screenPadding, chromePadding };

export const lightTheme: Theme = { ...base, scheme: 'light', colors: lightColors };
export const darkTheme: Theme = { ...base, scheme: 'dark', colors: darkColors };

/**
 * What the deliverer chose, which is not the same as what is on screen.
 * 'system' defers to the OS and keeps following it; the other two pin the app.
 */
export type ThemeMode = 'system' | 'light' | 'dark';

type ThemeContextValue = Theme & {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
};

const STORAGE_KEY = 'hungry.theme-mode';

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

/**
 * Holds the appearance choice and resolves it to a theme.
 *
 * The choice is persisted, but rendering never waits on the read: the app
 * starts on the OS scheme and swaps if storage says otherwise — a one-frame
 * flip for someone who pinned the app, instead of a blank screen for everyone.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!cancelled && isThemeMode(stored)) setModeState(stored);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const scheme: ColorSchemeName =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  const value = useMemo<ThemeContextValue>(
    () => ({
      ...(scheme === 'dark' ? darkTheme : lightTheme),
      mode,
      isDark: scheme === 'dark',
      setMode,
    }),
    [mode, scheme, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}

/** The active palette on its own — the common case. */
export function useColors(): Colors {
  return useTheme().colors;
}

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

/**
 * Turns a stylesheet into a themed one:
 *
 * ```ts
 * const useStyles = makeStyles((c, t) => ({ card: { backgroundColor: c.surface, borderRadius: t.radius.card } }));
 * ```
 *
 * Both sheets are built once at module scope; the hook only picks between them,
 * so a theme switch swaps a reference rather than rebuilding styles.
 */
export function makeStyles<T extends NamedStyles<T>>(factory: (colors: Colors, theme: Theme) => T) {
  const sheets = {
    light: StyleSheet.create(factory(lightTheme.colors, lightTheme)),
    dark: StyleSheet.create(factory(darkTheme.colors, darkTheme)),
  };

  return function useStyles(): T {
    return sheets[useTheme().scheme];
  };
}
