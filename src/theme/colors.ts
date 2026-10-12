// Hungry Rider — colours. Source: design system/handoff/tokens.json.
//
// Components read semantic tokens only (`colors.ink`, `colors.primary`…), never
// the palette or a hex literal. Two rules carry the whole system:
//   - Navy acts, orange signals. Every button is `ink`; `primary` is reserved
//     for status dots, progress, countdowns and today's bar — never a fill
//     behind body text, never a button.
//   - Red appears only for errors and destructive actions (Log out).
export const palette = {
  navy: '#003049',
  orange: '#EA8608',
  orangeSoft: '#FCE9D2',
  white: '#FFFFFF',
  slate: '#5B6B75',
  slateLight: '#8A969C',
  green: '#2E7A3D',
  red: '#C2412D',
} as const;

export const lightColors = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F4F3F1', // inputs at rest, info note, OTP boxes, drawer today card
  surfaceSunken: '#F2F1EE', // segment track, neutral wells, disabled button, locked slider
  skeleton: '#EFEDEA',
  divider: '#EEF0F1',
  outline: '#D9DDE0', // chips, secondary button, checkbox off, sheet grabber, toggle off
  outlineSubtle: '#E3E6E8', // outlined back buttons
  iconWell: '#EEF0F1',
  ink: palette.navy,
  inkMuted: palette.slate,
  inkSubtle: palette.slateLight,
  onInk: palette.white,
  primary: palette.orange, // signals only — never a button fill
  onPrimary: palette.navy,
  primarySoft: palette.orangeSoft,
  success: palette.green,
  successSoft: 'rgba(58,151,76,0.14)',
  danger: palette.red,
  dangerSoft: '#FBEAE7',
  /** The soft orange halo around a focused input — blurred, never a hard ring. */
  focusGlow: 'rgba(234,134,8,0.35)',
  scrim: 'rgba(0,48,73,0.28)',
  toast: palette.navy,
  onToast: palette.white,
  spinnerTrackOnInk: 'rgba(255,255,255,0.35)',
  spinnerTrack: 'rgba(0,48,73,0.18)',
  /**
   * The brand block behind the auth header and the pickup-code screen. Unlike
   * `ink` it does not flip in dark mode: the logo and food pattern are drawn
   * for navy.
   */
  brand: palette.navy,
  onBrand: palette.white,
  /** Always white: map marker rims, toggle knob — drawn over coloured fills. */
  knob: palette.white,
  /** The Tunisian flag in the phone field's country segment. */
  flagRed: '#E70013',
  // Rider map tokens (DRIVER_APP.md §2).
  zoneHotFill: 'rgba(234,134,8,0.20)',
  zoneHotStroke: 'rgba(234,134,8,0.55)',
  zoneFill: 'rgba(234,134,8,0.10)',
  zoneStroke: 'rgba(234,134,8,0.30)',
  riderHalo: 'rgba(0,48,73,0.12)',
  drawerScrim: 'rgba(0,48,73,0.40)',
  routeCasing: '#FFFFFF',
  route: palette.navy,
  routeNext: 'rgba(0,48,73,0.60)',
  chartBar: '#E3E6E8',
  chartBarCurrent: palette.orange,
} as const;

export type ColorToken = keyof typeof lightColors;
export type Colors = { readonly [K in ColorToken]: string };

/**
 * Dark palette. The board is light-only; this is the same semantic token set
 * inverted so the existing Dark mode setting keeps working. `ink` turns light
 * and `onInk` turns navy, so a primary button stays the highest-contrast
 * element on screen in both themes. Surfaces climb from `background` towards
 * `surfaceSunken`, tinted towards the brand navy.
 */
export const darkColors: Colors = {
  background: '#0A1820',
  surface: '#10212B',
  surfaceMuted: '#162A35',
  surfaceSunken: '#1B313D',
  skeleton: '#1F3541',
  divider: '#1F3440',
  outline: '#34495A',
  outlineSubtle: '#2B404D',
  iconWell: '#1F3440',
  ink: '#EEF3F6',
  inkMuted: '#A7B5BE',
  inkSubtle: '#7B8C96',
  onInk: palette.navy,
  primary: palette.orange,
  onPrimary: palette.navy,
  primarySoft: '#3B2A15',
  success: '#5DBB70',
  successSoft: 'rgba(93,187,112,0.16)',
  danger: '#EE7A66',
  dangerSoft: '#3A221E',
  focusGlow: 'rgba(234,134,8,0.45)',
  scrim: 'rgba(0,0,0,0.5)',
  toast: '#EEF3F6',
  onToast: palette.navy,
  spinnerTrackOnInk: 'rgba(0,48,73,0.25)',
  spinnerTrack: 'rgba(238,243,246,0.2)',
  brand: palette.navy,
  onBrand: palette.white,
  knob: palette.white,
  flagRed: '#E70013',
  zoneHotFill: 'rgba(234,134,8,0.22)',
  zoneHotStroke: 'rgba(234,134,8,0.6)',
  zoneFill: 'rgba(234,134,8,0.12)',
  zoneStroke: 'rgba(234,134,8,0.35)',
  riderHalo: 'rgba(238,243,246,0.16)',
  drawerScrim: 'rgba(0,0,0,0.55)',
  routeCasing: '#0A1820',
  route: '#EEF3F6',
  routeNext: 'rgba(238,243,246,0.6)',
  chartBar: '#2B404D',
  chartBarCurrent: palette.orange,
};

/** `#RRGGBB` + alpha → `rgba()`, for overlays whose opacity animates (map pulse). */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
