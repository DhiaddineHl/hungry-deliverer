// Hungry Rider — typography. Poppins, one weight per file.
//
// Android does not synthesize weights for custom fonts, so a weight is chosen
// by `fontFamily`, never by `fontWeight`. The family names are the ones the
// expo-font config plugin embeds (the file name) and `useFonts` registers in
// the root layout — keep the two in step.
import type { TextStyle } from 'react-native';

export const fontFamily = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  extrabold: 'Poppins_800ExtraBold',
} as const;

const t = (family: string, fontSize: number, lineHeight: number, letterSpacing = 0): TextStyle => ({
  fontFamily: family,
  fontSize,
  lineHeight,
  letterSpacing,
});
const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

export const typography = {
  display: t(fontFamily.bold, 28, 34, -0.6), // page / auth headings
  title: t(fontFamily.bold, 24, 30, -0.4), // success title, help headline
  heading: t(fontFamily.bold, 20, 26, -0.3), // sheet title, state view title
  sectionTitle: t(fontFamily.bold, 18, 24, -0.2), // section headers, top bar title
  contactName: t(fontFamily.bold, 18, 24, -0.2),
  rowTitle: t(fontFamily.bold, 16, 22),
  button: t(fontFamily.bold, 16, 20),
  buttonSecondary: t(fontFamily.semibold, 16, 20),
  input: t(fontFamily.regular, 16, 22),
  body: t(fontFamily.regular, 16, 24),
  bodySmall: t(fontFamily.regular, 15, 22),
  itemTitle: t(fontFamily.bold, 15, 20),
  itemLabel: t(fontFamily.semibold, 15, 20),
  price: { ...t(fontFamily.bold, 15, 20), ...tabular } as TextStyle,
  amount: { ...t(fontFamily.bold, 16, 22), ...tabular } as TextStyle,
  chip: t(fontFamily.semibold, 14, 18),
  pill: t(fontFamily.bold, 14, 18),
  link: { ...t(fontFamily.semibold, 14, 18), textDecorationLine: 'underline' } as TextStyle,
  description: t(fontFamily.regular, 14, 20),
  itemLine: t(fontFamily.regular, 14, 20),
  meta: t(fontFamily.medium, 13, 18),
  metaStrong: { ...t(fontFamily.bold, 13, 18), ...tabular } as TextStyle,
  label: t(fontFamily.semibold, 13, 18),
  caption: t(fontFamily.medium, 12, 16),
  fieldMessage: t(fontFamily.semibold, 12, 16),
  badge: t(fontFamily.bold, 12, 16),
  overline: { ...t(fontFamily.semibold, 11, 14, 1), textTransform: 'uppercase' } as TextStyle,
  chartValue: { ...t(fontFamily.bold, 11, 14), ...tabular } as TextStyle,
  stat: { ...t(fontFamily.bold, 18, 24), ...tabular } as TextStyle,
  otpDigit: { ...t(fontFamily.bold, 22, 28), ...tabular } as TextStyle,
  /** Offer and balance amounts (`size.offerAmount`). */
  offerAmount: { ...t(fontFamily.extrabold, 40, 44, -1), ...tabular } as TextStyle,
  /** Delivery complete, month total (`size.successAmount`). */
  successAmount: { ...t(fontFamily.extrabold, 32, 38, -0.8), ...tabular } as TextStyle,
  /** The pickup code held up to the counter. */
  pickupCode: { ...t(fontFamily.extrabold, 96, 104, -2), ...tabular } as TextStyle,
} as const;

export type TypographyToken = keyof typeof typography;
