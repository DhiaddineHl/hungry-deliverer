import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { Palettes, type ColorSchemeName, type ThemeColors } from '@/constants/theme';

const STORAGE_KEY = 'hungry.theme-mode';

/**
 * What the deliverer chose, which is not the same as what is on screen.
 * 'system' defers to the OS and keeps following it as it changes (including the
 * automatic sundown switch); the other two pin the app regardless.
 */
export type ThemeMode = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  mode: ThemeMode;
  /** The scheme actually being rendered, once 'system' has been resolved. */
  scheme: ColorSchemeName;
  colors: ThemeColors;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

/**
 * Holds the appearance choice and resolves it to a palette.
 *
 * The choice is persisted, but rendering never waits on the read: the app
 * starts on the OS scheme — the best guess available — and swaps if storage
 * turns out to say otherwise. That costs a one-frame flip for someone who
 * pinned the app against their system setting, and saves a blank screen on
 * every launch for everyone.
 *
 * Requires `userInterfaceStyle: "automatic"` in app.json. Locked to "light",
 * React Native reports 'light' forever and 'system' would be stuck there.
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
      // An unreadable preference is not worth failing over: 'system' is a fine
      // answer, and the next deliberate choice writes a good value back.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    // Applied first, persisted after: the toggle must not feel like it is
    // waiting for a disk write, and a failed write only costs the next launch.
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const scheme: ColorSchemeName =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      scheme,
      colors: Palettes[scheme],
      isDark: scheme === 'dark',
      setMode,
    }),
    [mode, scheme, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/** The active palette on its own — the common case. */
export function useColors(): ThemeColors {
  return useTheme().colors;
}
