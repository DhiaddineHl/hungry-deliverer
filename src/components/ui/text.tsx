import { Text as RNText, type TextProps } from 'react-native';

import { useTheme, type ColorToken, type TypographyToken } from '@/theme';

type Props = TextProps & {
  /** A type token from the design system — never a raw size. */
  variant?: TypographyToken;
  color?: ColorToken;
  /** Forces tabular figures, for amounts, times and counts in columns. */
  tabular?: boolean;
  align?: 'left' | 'center' | 'right';
};

/**
 * Poppins text, styled only by token. Dynamic Type is honoured up to 1.3×,
 * the ceiling the layouts are checked against (DESIGN_SYSTEM.md §11).
 */
export function Text({
  variant = 'body',
  color = 'ink',
  tabular,
  align,
  style,
  ...rest
}: Props) {
  const { typography, colors } = useTheme();
  return (
    <RNText
      maxFontSizeMultiplier={1.3}
      {...rest}
      style={[
        typography[variant],
        { color: colors[color] },
        tabular && { fontVariant: ['tabular-nums'] },
        align && { textAlign: align },
        style,
      ]}
    />
  );
}
