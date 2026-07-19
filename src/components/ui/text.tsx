import { Text as RNText, type TextProps } from 'react-native';

import { Colors, Fonts, type FontWeightName } from '@/constants/theme';

type Props = TextProps & {
  weight?: FontWeightName;
  size?: number;
  color?: string;
};

/** Poppins-backed Text. The fonts are bundled by the expo-font config plugin. */
export function Text({
  weight = 'regular',
  size = 15,
  color = Colors.text,
  style,
  ...rest
}: Props) {
  return (
    <RNText
      {...rest}
      style={[{ fontFamily: Fonts[weight], fontSize: size, color }, style]}
    />
  );
}
