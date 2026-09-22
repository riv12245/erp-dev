import { useTenantStore } from '../store/tenant-store';

export function useTenant() {
  const tenant = useTenantStore((state) => state.tenant);
  const tenantId = useTenantStore((state) => state.tenantId);
  const setTenant = useTenantStore((state) => state.setTenant);
  const clearTenant = useTenantStore((state) => state.clearTenant);

  return { tenant, tenantId, setTenant, clearTenant };
}