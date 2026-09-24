import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, TenantProvider, PermissionProvider } from '../store/providers';
import { LoginScreen } from '../features/auth/LoginScreen';
import { DashboardScreen } from '../features/dashboard/Index';
import { CRMScreen } from '../features/crm/Index';
import { SalesScreen } from '../features/sales/Index';
import { InventoryScreen } from '../features/inventory/Index';
import { PurchasingScreen } from '../features/purchasing/Index';
import { FinanceScreen } from '../features/finance/Index';
import { ProtectedRoute } from '../permissions/PermissionGate';
import { EnterpriseShell } from './EnterpriseShell';

export function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <Routes>
              <Route path="/auth/login" element={<LoginScreen />} />
              <Route element={<ProtectedRoute><EnterpriseShell /></ProtectedRoute>}>
                <Route path="/" element={<DashboardScreen />} />
                <Route path="/crm" element={<CRMScreen />} />
                <Route path="/sales" element={<SalesScreen />} />
                <Route path="/inventory" element={<InventoryScreen />} />
                <Route path="/purchasing" element={<PurchasingScreen />} />
                <Route path="/finance" element={<FinanceScreen />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
