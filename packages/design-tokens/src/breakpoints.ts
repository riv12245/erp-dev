/**
 * Responsive breakpoints (used primarily by web layouts).
 */

export const breakpoints = {
  xs: 0,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type BreakpointToken = keyof typeof breakpoints;

export function isBelow(token: BreakpointToken, width: number): boolean {
  return width < breakpoints[token];
}

export function isAbove(token: BreakpointToken, width: number): boolean {
  return width >= breakpoints[token];
}