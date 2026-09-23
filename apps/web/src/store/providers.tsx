import React from 'react';
import { useAuthStore } from './auth-store';

export function AuthProvider({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    let mounted = true;
    void useAuthStore.getState().restore().finally(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, []);
  if (!ready) return <></>;
  return <>{children}</>;
}

export function TenantProvider({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  return <>{children}</>;
}

export function PermissionProvider({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  return <>{children}</>;
}
