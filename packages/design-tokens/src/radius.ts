/**
 * Corner radius scale.
 */

export const radius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  full: 9999,
} as const;

export type RadiusToken = keyof typeof radius;