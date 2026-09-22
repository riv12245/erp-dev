import React from 'react';
import { RbacEngine, PermissionPrincipal, PermissionName } from '@erp/permissions';
import { usePermissionStore } from '../store/permission-store';

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

function hasPermissionSync(principal: PermissionPrincipal, permission: PermissionName): boolean {
  const engine = new RbacEngine([]);
  return engine.evaluate({ principal, subject: { tenantId: principal.tenantId }, permission }).allowed;
}