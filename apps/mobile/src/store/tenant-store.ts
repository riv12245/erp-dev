import { create } from 'zustand';

export interface TenantInfo {
  readonly id?: string;
  readonly name?: string;
  readonly slug?: string;
}

interface TenantState {
  readonly tenant: TenantInfo | null;
  readonly tenantId: string | null;
  readonly setTenant: (tenant: TenantInfo) => void;
  readonly setTenantId: (tenantId: string) => void;
  readonly clearTenant: () => void;
}

export const useTenantStore = create<TenantState>((set) => ({
  tenant: null,
  tenantId: null,
  setTenant: (tenant) => set({ tenant, tenantId: tenant.id ?? null }),
  setTenantId: (tenantId) => set({ tenantId }),
  clearTenant: () => set({ tenant: null, tenantId: null }),
}));