import { Router } from 'express';
import { SalesModule, registerSalesRoutes } from './sales/index.js';
import { CrmModule, registerCrmRoutes } from './crm/index.js';
import { InventoryModule, registerInventoryRoutes } from './inventory/index.js';
import { FinanceModule, registerFinanceRoutes } from './finance/index.js';
import { EshopModule, registerEshopRoutes } from './eshop/index.js';
import { HrModule, registerHrRoutes } from './hr/index.js';
import { ProjectsModule, registerProjectsRoutes } from './projects/index.js';
import { PurchasingModule, registerPurchasingRoutes } from './purchasing/index.js';
import { LogisticsModule, registerLogisticsRoutes } from './logistics/index.js';
import { ProductionModule, registerProductionRoutes } from './production/index.js';
import { BookingsModule, registerBookingsRoutes } from './bookings/index.js';
import { FieldServiceModule, registerFieldServiceRoutes } from './field-service/index.js';

export interface ModuleDescriptor {
  readonly id: string;
  readonly displayName: string;
  readonly registerRoutes: (router: Router) => void;
}

/**
 * Domain module registry. Adding a module is one entry here plus its
 * vertical slice under modules/<id>/. Each route group is mounted under
 * the /api/v1 prefix; implementers must always resolve tenant context.
 */
export const DOMAIN_MODULES: readonly ModuleDescriptor[] = [
  { ...SalesModule, registerRoutes: registerSalesRoutes },
  { ...CrmModule, registerRoutes: registerCrmRoutes },
  { ...InventoryModule, registerRoutes: registerInventoryRoutes },
  { ...FinanceModule, registerRoutes: registerFinanceRoutes },
  { ...EshopModule, registerRoutes: registerEshopRoutes },
  { ...HrModule, registerRoutes: registerHrRoutes },
  { ...ProjectsModule, registerRoutes: registerProjectsRoutes },
  { ...PurchasingModule, registerRoutes: registerPurchasingRoutes },
  { ...LogisticsModule, registerRoutes: registerLogisticsRoutes },
  { ...ProductionModule, registerRoutes: registerProductionRoutes },
  { ...BookingsModule, registerRoutes: registerBookingsRoutes },
  { ...FieldServiceModule, registerRoutes: registerFieldServiceRoutes },
];

export function registerAllModuleRoutes(router: Router): void {
  for (const moduleDescriptor of DOMAIN_MODULES) {
    moduleDescriptor.registerRoutes(router);
  }
}

export default DOMAIN_MODULES;