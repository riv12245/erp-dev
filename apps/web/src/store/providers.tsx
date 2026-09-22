import React from 'react';

export function AuthProvider({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  return <>{children}</>;
}

export function TenantProvider({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  return <>{children}</>;
}

export function PermissionProvider({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  return <>{children}</>;
}