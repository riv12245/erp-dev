import { NativeModules } from 'react-native';
import type { SessionStorage } from '@erp/api-client';
interface SecureSessionModule {
  read(): Promise<string | null>;
  write(value: string | null): Promise<void>;
  blocked(): Promise<boolean>;
  block(value: boolean): Promise<void>;
}
function secure(): SecureSessionModule {
  const module = NativeModules.ErpSecureSession as SecureSessionModule | undefined;
  if (!module) throw new Error('Android secure session storage is unavailable');
  return module;
}
export const sessionStorage: SessionStorage = {
  read: () => secure().read(), write: (value) => secure().write(value),
  blocked: () => secure().blocked(), block: (value) => secure().block(value),
};
