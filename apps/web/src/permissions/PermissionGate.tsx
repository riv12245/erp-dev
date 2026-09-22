import React from 'react';
import { Navigate } from 'react-router-dom';
import { RbacEngine, PermissionPrincipal, PermissionName } from '@erp/permissions';
import { usePermissionStore } from '../store/permission-store';
import { useAuthStore } from '../store/auth-store';

export interface PermissionGateProps {
  readonly permission: PermissionName;
  readonly children: React.ReactNode;
  readonly fallback?: React.ReactNode;
}

/** GATE-DENY by default. Only renders children when the current principal holds the permission. */
export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps): React.JSX.Element {
  const principal = usePermissionStore((state) => state.principal);
  const allowed = principal ? hasPermissionSync(principal, permission) : false;
  return allowed ? <>{children}</> : <>{fallback}</>;
}

export function ProtectedRoute({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (isAuthenticated) return <>{children}</>;
  return <Navigate to="/auth/login" replace />;
}

function hasPermissionSync(principal: PermissionPrincipal, permission: PermissionName): boolean {
  const engine = new RbacEngine([]);
  const evaluation = engine.evaluate({
    principal,
    subject: { tenantId: principal.tenantId },
    permission,
  });
  return evaluation.allowed;
}