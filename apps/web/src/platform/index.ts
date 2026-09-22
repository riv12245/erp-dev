import { Platform } from 'react-native';
import { colors } from '@erp/design-tokens';

export const isWeb = Platform.OS === 'web';
export const isNative = Platform.OS !== 'web';

export const platform = {
  os: Platform.OS as 'ios' | 'android' | 'web',
  isWeb,
  isNative,
  isAndroid: Platform.OS === 'android',
  isIOS: Platform.OS === 'ios',
};

export const focusVisibleStyles = {
  focus: {
    outlineStyle: 'solid',
    outlineWidth: 2,
    outlineColor: colors.border.focus,
  },
} as const;