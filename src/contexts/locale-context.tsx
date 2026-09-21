import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  isLanguage,
  translate,
  type Language,
  type TranslateOptions,
  type TranslationKey,
} from '@/i18n';

const STORAGE_KEY = 'hungry.language';

type LocaleContextValue = {
  /** The language actually in use. */
  language: Language;
  /** True while no explicit choice has been made — the device is deciding. */
  isFollowingDevice: boolean;
  setLanguage: (language: Language) => void;
  /** Follow the device again, dropping any explicit choice. */
  useDeviceLanguage: () => void;
  t: (key: TranslationKey, options?: TranslateOptions) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * The device's preferred language, if the app speaks it.
 *
 * `getLocales()` is ordered by preference, so the first supported entry is the
 * best answer — someone whose list is [de, fr, en] gets French, not English.
 * Matching is on `languageCode`, which drops the region: fr-CA and fr-FR are
 * both French as far as this catalogue is concerned.
 */
function deviceLanguage(): Language | null {
  for (const locale of getLocales()) {
    if (isLanguage(locale.languageCode)) return locale.languageCode;
  }
  return null;
}

/**
 * Holds the language and re-renders the tree when it changes.
 *
 * `t` is rebuilt on every language change *on purpose*: it is what makes a
 * memoised subtree re-render with new copy. Reading `i18n.t` directly instead
 * would leave any `React.memo` component showing the old language until
 * something else happened to re-render it.
 */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // Starts on the device language so the very first frame is already right for
  // most people; a stored choice overrides it once the read comes back.
  const [language, setLanguageState] = useState<Language>(() => deviceLanguage() ?? 'en');
  const [isFollowingDevice, setIsFollowingDevice] = useState(true);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (cancelled || !isLanguage(stored)) return;
        setLanguageState(stored);
        setIsFollowingDevice(false);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    setIsFollowingDevice(false);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const useDeviceLanguage = useCallback(() => {
    setLanguageState(deviceLanguage() ?? 'en');
    setIsFollowingDevice(true);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      language,
      isFollowingDevice,
      setLanguage,
      useDeviceLanguage,
      // Identity changes with the language — see the note above.
      t: (key, options) => translate(language, key, options),
    }),
    [language, isFollowingDevice, setLanguage, useDeviceLanguage]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}

/** The common case: just the translate function. */
export function useTranslation() {
  return useLocale().t;
}
