import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, TenantProvider, PermissionProvider } from '../store/providers';
import { LoginScreen } from '../features/auth/LoginScreen';
import { DashboardScreen } from '../features/dashboard/Index';
import { CRMScreen } from '../features/crm/Index';
import { SalesScreen } from '../features/sales/Index';
import { InventoryScreen } from '../features/inventory/Index';
import { FinanceScreen } from '../features/finance/Index';
import { ProtectedRoute } from '../permissions/PermissionGate';

export function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <Routes>
              <Route path="/auth/login" element={<LoginScreen />} />
              <Route path="/" element={<ProtectedRoute><DashboardScreen /></ProtectedRoute>} />
              <Route path="/crm" element={<ProtectedRoute><CRMScreen /></ProtectedRoute>} />
              <Route path="/sales" element={<ProtectedRoute><SalesScreen /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute><InventoryScreen /></ProtectedRoute>} />
              <Route path="/finance" element={<ProtectedRoute><FinanceScreen /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}