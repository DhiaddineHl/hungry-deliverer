import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

import { useColors } from '@/contexts/theme-context';
import { Palettes, type ThemeColors } from '@/constants/theme';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

/**
 * Turns a stylesheet into a themed one.
 *
 * Usage is a one-word change from a plain stylesheet — `StyleSheet.create({…})`
 * becomes `makeStyles((c) => ({…}))`, `Colors.x` becomes `c.x`, and the
 * component calls `const styles = useStyles()`:
 *
 * ```ts
 * const useStyles = makeStyles((c) => ({ card: { backgroundColor: c.card } }));
 * ```
 *
 * Both palettes are built once, at module scope, and the hook only picks
 * between them. That keeps the cost identical to the static stylesheets this
 * replaced — a theme switch swaps a reference, it does not rebuild styles — and
 * it means a palette typo fails on import rather than on the first dark render.
 */
export function makeStyles<T extends NamedStyles<T>>(factory: (colors: ThemeColors) => T) {
  const sheets: Record<string, T> = {
    light: StyleSheet.create(factory(Palettes.light)),
    dark: StyleSheet.create(factory(Palettes.dark)),
  };

  return function useStyles(): T {
    const colors = useColors();
    return colors === Palettes.dark ? sheets.dark : sheets.light;
  };
}
