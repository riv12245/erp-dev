import { Platform } from 'react-native';

export const isWeb = Platform.OS === 'web';
export const isNative = Platform.OS !== 'web';

export const platform = {
  os: Platform.OS as 'ios' | 'android',
  isWeb,
  isNative,
  isAndroid: Platform.OS === 'android',
  isIOS: Platform.OS === 'ios',
};