import React from 'react';
import { BusinessPermissionProvider } from './business-permission-provider';
import { AppState } from 'react-native';
import { useAuthStore } from './auth-store';

export function AuthProvider({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    let mounted = true;
    void useAuthStore.getState().restore().finally(() => { if (mounted) setReady(true); });
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') void useAuthStore.getState().restore();
    });
    return () => { mounted = false; listener.remove(); };
  }, []);
  if (!ready) return <></>;
  return <>{children}</>;
}

export function TenantProvider({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  return <>{children}</>;
}

export function PermissionProvider({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  return <BusinessPermissionProvider>{children}</BusinessPermissionProvider>;
}
