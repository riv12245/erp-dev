/**
 * Motion duration and easing tokens.
 */

export const duration = {
  instant: 0,
  fast: 120,
  normal: 240,
  slow: 400,
} as const;

export const easing = {
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export const motion = { duration, easing } as const;