import type { useLocale } from '@/contexts/locale-context';
import { en } from '@/i18n/en';
import type { TranslationKey } from '@/i18n';

/**
 * Renders a react-hook-form field error.
 *
 * The schemas put catalogue keys in `message` (see `schemas.ts`), so the usual
 * case is a lookup. Anything else is passed through untouched: zod's own
 * built-in messages and any server-supplied text reach this function too, and
 * those are already sentences.
 */
export function translateFieldError(
  t: ReturnType<typeof useLocale>['t'],
  message: string | undefined
): string {
  if (!message) return '';
  return isTranslationKey(message) ? t(message) : message;
}

function isTranslationKey(message: string): message is TranslationKey {
  const [section, key] = message.split('.');
  if (!section || !key) return false;
  const group = (en as Record<string, Record<string, string>>)[section];
  return !!group && key in group;
}
