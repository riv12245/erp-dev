/**
 * Semantic color palette for the ERP platform.
 */

export const colors = {
  primary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },
  neutral: {
    slate50: '#f8fafc',
    slate100: '#f1f5f9',
    slate200: '#e2e8f0',
    slate300: '#cbd5e1',
    slate400: '#94a3b8',
    slate500: '#64748b',
    slate600: '#475569',
    slate700: '#334155',
    slate800: '#1e293b',
    slate900: '#0f172a',
  },
  semantic: {
    success: '#16a34a',
    warning: '#d97706',
    danger: '#dc2626',
    info: '#0284c7',
  },
  text: {
    primary: '#1e293b',
    secondary: '#475569',
    muted: '#94a3b8',
    disabled: '#cbd5e1',
    inverse: '#ffffff',
  },
  background: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    elevated: '#ffffff',
    overlay: 'rgba(15, 23, 42, 0.5)',
  },
  border: {
    default: '#e2e8f0',
    strong: '#cbd5e1',
    focus: '#6366f1',
    error: '#dc2626',
  },
} as const;

export type SemanticColor = keyof typeof colors.semantic;