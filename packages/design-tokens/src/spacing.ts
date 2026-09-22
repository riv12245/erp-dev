/**
 * Spacing scale for the ERP design system (4px base unit).
 */

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
  '5xl': 96,
} as const;

export type SpacingToken = keyof typeof spacing;

export function spacingFor(token: SpacingToken | number): number {
  if (typeof token === 'number') return token;
  return spacing[token];
}