/** ERP-DEV enterprise semantic palette, shared by web and native. */
export const colors = {
  primary: {
    50: '#ecfaf6',
    100: '#d5f4ea',
    200: '#abe8d7',
    300: '#75d7c0',
    400: '#35bfa3',
    500: '#00a88d',
    600: '#00977d',
    700: '#087d6b',
    800: '#136456',
    900: '#184f46',
  },
  neutral: {
    slate50: '#f5f7f8',
    slate100: '#eef2f4',
    slate200: '#e2e8eb',
    slate300: '#c7d2d8',
    slate400: '#91a4ac',
    slate500: '#667b85',
    slate600: '#506570',
    slate700: '#344b55',
    slate800: '#223841',
    slate900: '#17272d',
  },
  semantic: {
    success: '#14816b',
    warning: '#ba770f',
    danger: '#c43c45',
    info: '#2772ae',
  },
  text: {
    primary: '#17252c',
    secondary: '#506570',
    muted: '#81939d',
    disabled: '#a2afb5',
    inverse: '#ffffff',
  },
  background: {
    primary: '#ffffff',
    secondary: '#f4f7f8',
    elevated: '#ffffff',
    overlay: 'rgba(9, 26, 32, 0.56)',
  },
  border: {
    default: '#e1e8ed',
    strong: '#c7d2d8',
    focus: '#00977d',
    error: '#c43c45',
  },
} as const;

export type SemanticColor = keyof typeof colors.semantic;
