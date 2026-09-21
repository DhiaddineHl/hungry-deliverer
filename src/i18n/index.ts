import { I18n } from 'i18n-js';

import { en } from './en';
import { fr } from './fr';

export const SUPPORTED_LANGUAGES = ['en', 'fr'] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/**
 * Every key in the catalogue as a dotted path — `'settings.title'`,
 * `'wallet.cashOutCaption'`. Built from the English catalogue, so `t()` refuses
 * a key that does not exist and autocompletes the ones that do.
 */
export type TranslationKey = {
  [Section in keyof typeof en]: `${Section & string}.${keyof (typeof en)[Section] & string}`;
}[keyof typeof en];

export const i18n = new I18n({ en, fr });

// An untranslated key falls back to the same key in `defaultLocale` rather than
// rendering the raw path. With both catalogues type-checked against each other
// this should be unreachable — it is here for the OTA case where a new key
// ships in code before a catalogue update reaches the device.
i18n.enableFallback = true;
i18n.defaultLocale = 'en';
i18n.locale = 'en';

/** Values substituted into a `%{name}` placeholder. */
export type TranslateOptions = Record<string, string | number>;

/**
 * Resolves a key in a given language.
 *
 * The language is passed per call rather than by setting `i18n.locale` first:
 * the provider would have to do that while rendering, and mutating shared
 * module state mid-render is exactly the kind of thing that goes wrong under
 * concurrent rendering (and that React's lint rules refuse). Nothing here is
 * stateful, so two languages could be resolved in the same pass without
 * interfering.
 */
export function translate(
  language: Language,
  key: TranslationKey,
  options?: TranslateOptions
): string {
  return i18n.t(key, { locale: language, ...options });
}
