import { Text as RNText, type TextProps } from 'react-native';

import { useColors } from '@/contexts/theme-context';
import { Fonts, type FontWeightName } from '@/constants/theme';

type Props = TextProps & {
  weight?: FontWeightName;
  size?: number;
  color?: string;
};

/** Poppins-backed Text. The fonts are bundled by the expo-font config plugin. */
export function Text({ weight = 'regular', size = 15, color, style, ...rest }: Props) {
  const colors = useColors();
  // Defaulted here rather than in the parameter list: the fallback is a themed
  // value, and a default parameter cannot read a hook.
  const resolved = color ?? colors.text;

  return (
    <RNText
      {...rest}
      style={[{ fontFamily: Fonts[weight], fontSize: size, color: resolved }, style]}
    />
  );
}
