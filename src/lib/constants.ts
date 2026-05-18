/**
 * Design tokens — load-bearing per the spec.
 * Colors, font families, spacing, radii, shadows. Used everywhere.
 */

export const colors = {
  cream: '#FBF4E9',
  dark: '#2D241B',
  brownMid: '#6E5E4E',
  taupe: '#A0907E',
  terracotta: '#C96442',
  golden: '#E8A93A',
  amberLight: '#F5C77E',
  sage: '#6B8E5A',
  sageSoft: '#DCE7C9',
  surface: '#FFFDF6',
  rule: '#ECD49A',
  white: '#FFFFFF',
} as const;

/**
 * Avatar palette — used for initials circles and as the base color
 * for StripePattern photo placeholders. Hand-tuned pairs (light/dark)
 * for visible stripe contrast that holds across all 7 tones.
 */
export const avatarTones = {
  peach: { base: 'rgb(212, 146, 102)', light: '#F0C7A0', dark: '#D49266' },
  golden: { base: 'rgb(229, 193, 114)', light: '#F5DD9C', dark: '#E0B85B' },
  sage: { base: 'rgb(144, 174, 131)', light: '#B5C9A8', dark: '#7C9E6A' },
  mauve: { base: 'rgb(214, 187, 208)', light: '#D6BBD0', dark: '#A685A0' },
  slate: { base: 'rgb(200, 211, 222)', light: '#C8D3DE', dark: '#7A93AC' },
  rose: { base: 'rgb(240, 191, 200)', light: '#F0BFC8', dark: '#D08496' },
  butter: { base: 'rgb(242, 218, 158)', light: '#F2DA9E', dark: '#E5C172' },
} as const;

export type AvatarTone = keyof typeof avatarTones;

export const fonts = {
  serif: 'InstrumentSerif_400Regular_Italic',
  serifRegular: 'InstrumentSerif_400Regular',
  sans: 'PlusJakartaSans_400Regular',
  sansMedium: 'PlusJakartaSans_500Medium',
  sansSemi: 'PlusJakartaSans_600SemiBold',
  sansBold: 'PlusJakartaSans_700Bold',
  sansExtra: 'PlusJakartaSans_800ExtraBold',
  mono: 'SpaceGrotesk_500Medium',
  monoBold: 'SpaceGrotesk_700Bold',
} as const;

export const radii = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
} as const;
