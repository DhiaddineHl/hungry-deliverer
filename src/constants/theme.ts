/**
 * Design tokens sampled from the frames in /design.
 */

export const Colors = {
  /** Deep navy — hotspot pills, Navigate button, call button, order-number screen. */
  navy: '#03324A',
  navyDeep: '#022639',
  /** Primary brand orange — Go online, Accept and Go, Validate Order, Confirm Delivery. */
  orange: '#E8890C',
  /** Darker orange used for the filled portion of the auto-decline countdown. */
  orangeDeep: '#B26A08',
  /** Desaturated orange for a CTA that is present but not yet actionable. */
  orangeMuted: '#BF8437',
  orangeSoft: '#FDF0DC',
  /** Teal/green — "Order found !", "Order is ready", busy-area banner. */
  teal: '#17A08D',
  tealDark: '#0F8574',
  /** Google-Maps-like route stroke and ETA bubble. */
  route: '#5B2FE0',
  routeCasing: '#4A22C4',
  etaBadge: '#1A73E8',
  pin: '#EA4335',
  origin: '#9AA0A6',

  text: '#111418',
  textSecondary: '#6B7280',
  textMuted: '#9AA0A6',
  disabled: '#D5D8DC',
  border: '#E5E7EB',

  card: '#FFFFFF',
  background: '#FFFFFF',
  scrim: 'rgba(0,0,0,0.35)',
  white: '#FFFFFF',
} as const;

export const Fonts = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

export type FontWeightName = keyof typeof Fonts;

export const Spacing = {
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/** Card / pill elevation matching the frames' soft drop shadows. */
export const Shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  pill: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
} as const;
