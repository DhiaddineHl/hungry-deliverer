/**
 * Design tokens sampled from the frames in /design.
 *
 * Colours come in two palettes. The split is deliberate and load-bearing:
 *
 * - **Brand tokens** (navy, orange, teal, the map colours) are *identical* in
 *   both. A brand is not repainted at dusk — the orange CTA is the same orange
 *   in a dark room, and the route line has to keep matching what a map looks
 *   like. They live in `BrandColors` and are spread into both palettes, so no
 *   caller has to know which kind of token it is holding.
 *
 * - **Surface tokens** (backgrounds, text, borders, scrims) flip. These are the
 *   only ones a palette actually redefines.
 *
 * `onNavy` deserves a note: plenty of text in this app sits on the navy header
 * or an orange button, and it stays white in *both* themes because its
 * background did too. That used to be written as `Colors.white`, which was
 * correct by accident — the moment a surface flips, "white" stops meaning
 * "readable on this". Anything drawn over a brand-coloured surface should use
 * `onNavy`; anything over a *theme* surface uses `text`.
 */

const BrandColors = {
  /** Deep navy — Navigate button, call button, order-number screen. */
  navy: '#03324A',
  navyDeep: '#022639',
  /** Primary brand orange — Go online, Accept and Go, Validate Order, Confirm Delivery. */
  orange: '#E8890C',
  /** Darker orange used for the filled portion of the auto-decline countdown. */
  orangeDeep: '#B26A08',
  /** Desaturated orange for a CTA that is present but not yet actionable. */
  orangeMuted: '#BF8437',
  /** Teal/green — "Order found !", "Order is ready". */
  teal: '#17A08D',
  tealDark: '#0F8574',
  /** Google-Maps-like route stroke and ETA bubble. */
  route: '#5B2FE0',
  routeCasing: '#4A22C4',
  etaBadge: '#1A73E8',
  pin: '#EA4335',
  origin: '#9AA0A6',
  /** Foreground for anything sitting on navy or orange, in either theme. */
  onNavy: '#FFFFFF',
} as const;

export const LightColors = {
  ...BrandColors,

  orangeSoft: '#FDF0DC',

  /** Destructive actions — Sign Out, Go offline — and their tinted backing. */
  danger: '#D22B2B',
  dangerSoft: '#FBDAD7',

  text: '#111418',
  textSecondary: '#6B7280',
  textMuted: '#9AA0A6',
  disabled: '#D5D8DC',
  border: '#E5E7EB',

  card: '#FFFFFF',
  /** One step back from `card` — the ground a card is laid on. */
  surface: '#F2F4F5',
  /** Inputs and other sunken fields. */
  field: '#E9E9E9',
  background: '#FFFFFF',
  scrim: 'rgba(0,0,0,0.35)',
  white: '#FFFFFF',

  /** Filter chips — the FAQ topic row. */
  chip: '#E3E3E3',
  chipActive: '#BFDCF7',
  chipActiveText: '#03324A',
  /** Bars of the weekly earnings chart that are not the highlighted day. */
  chartBar: '#C3D0D8',

  /**
   * The pastel icon tiles, as background/foreground pairs. They are tokens
   * rather than literals in the data files because a pastel is a *light-mode*
   * idea: the same wash on a dark card glares. Data names the tint it wants
   * ('warm', 'teal', …) and the palette decides what that looks like tonight.
   */
  tintWarm: '#F6E7D8',
  onTintWarm: '#B45309',
  tintTeal: '#D7EDE8',
  onTintTeal: '#0F5F52',
  tintRed: '#FADBD8',
  onTintRed: '#9B1C1C',
  tintBlue: '#DBEAFE',
  onTintBlue: '#03324A',
  tintNeutral: '#E6E6E6',
  onTintNeutral: '#4B5563',
} as const;

/**
 * The dark palette. Surfaces climb from `background` up to `card` rather than
 * using pure black: the navy header the pages already carry needs somewhere
 * darker than itself to sit against, and elevation has to read without the drop
 * shadows that do that job in light mode — a shadow is invisible on a dark
 * ground, so a dark card separates by being *lighter* than what is behind it.
 *
 * The greys are tinted towards the brand navy rather than neutral, so the fixed
 * navy chrome looks like it belongs to the same family of surfaces.
 */
export const DarkColors = {
  ...BrandColors,

  /** Dimmer than the light tint: a pale wash would glare against dark cards. */
  orangeSoft: '#3A2A12',

  danger: '#F2645A',
  dangerSoft: '#42211F',

  text: '#ECEFF1',
  textSecondary: '#A7B2BC',
  textMuted: '#7C8892',
  disabled: '#39444D',
  border: '#2A353E',

  card: '#152029',
  surface: '#0D161D',
  field: '#1E2A33',
  background: '#0A1219',
  /** Heavier than the light scrim — a dark sheet needs more to read as "behind". */
  scrim: 'rgba(0,0,0,0.6)',
  white: '#FFFFFF',

  chip: '#232F38',
  chipActive: '#1C3854',
  chipActiveText: '#A9CDF2',
  chartBar: '#3A4954',

  // The dark counterparts invert the relationship: a deep, desaturated ground
  // with a bright foreground, rather than a pale ground with a deep one.
  tintWarm: '#3A2C1C',
  onTintWarm: '#E0A45C',
  tintTeal: '#17332E',
  onTintTeal: '#5FD0BC',
  tintRed: '#3A2220',
  onTintRed: '#F08A82',
  tintBlue: '#1A2A3D',
  onTintBlue: '#8FC0F0',
  tintNeutral: '#232B31',
  onTintNeutral: '#AEB9C2',
} as const;

/**
 * The shape every themed component reads: the light palette's keys, with plain
 * `string` values.
 *
 * Not `typeof LightColors` directly — the palettes are `as const`, so that
 * would type every dark token as the light hex it must equal. Mapping to
 * `string` keeps the key set (a token added to one palette and forgotten in the
 * other still fails to compile, as the assignment below proves) while leaving
 * the values free to differ, which is the entire point of having two.
 */
export type ThemeColors = { readonly [Token in keyof typeof LightColors]: string };

const _darkIsComplete: ThemeColors = DarkColors;
void _darkIsComplete;

export type ColorSchemeName = 'light' | 'dark';

/** The pastel icon-tile families. Data names one; the palette colours it. */
export const TINTS = ['warm', 'teal', 'red', 'blue', 'neutral'] as const;

export type Tint = (typeof TINTS)[number];

/** Resolves a tint name to its `{ background, foreground }` pair. */
export function tintColors(colors: ThemeColors, tint: Tint) {
  switch (tint) {
    case 'warm':
      return { background: colors.tintWarm, foreground: colors.onTintWarm };
    case 'teal':
      return { background: colors.tintTeal, foreground: colors.onTintTeal };
    case 'red':
      return { background: colors.tintRed, foreground: colors.onTintRed };
    case 'blue':
      return { background: colors.tintBlue, foreground: colors.onTintBlue };
    case 'neutral':
      return { background: colors.tintNeutral, foreground: colors.onTintNeutral };
  }
}

export const Palettes: Record<ColorSchemeName, ThemeColors> = {
  light: LightColors,
  dark: DarkColors,
};

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

/**
 * Card / pill elevation matching the frames' soft drop shadows.
 *
 * These are the light-mode values, applied in both. In dark mode a drop shadow
 * is invisible against the ground — see the note on `DarkColors` — so it costs
 * nothing there, and the surface ramp carries the elevation instead.
 */
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
