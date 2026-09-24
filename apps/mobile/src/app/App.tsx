import React from 'react';
import { colors } from '@erp/design-tokens';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, TenantProvider, PermissionProvider } from '../store/providers';
import { LoginScreen } from '../features/auth/LoginScreen';
import { DashboardScreen } from '../features/dashboard/Index';
import { CRMScreen } from '../features/crm/Index';
import { InventoryScreen } from '../features/inventory/Index';
import { SalesScreen } from '../features/sales/Index';
import { PurchasingScreen } from '../features/purchasing/Index';
import { enableScreens } from 'react-native-screens';
import { useAuthStore } from '../store/auth-store';

enableScreens();

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  CRM: undefined;
  Inventory: undefined;
  Sales: undefined;
  Purchasing: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function App(): React.JSX.Element {
  const authenticated = useAuthStore((state) => state.isAuthenticated);
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <NavigationContainer>
              <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.neutral.slate900 }, headerTintColor: '#ffffff', headerTitleStyle: { fontWeight: '700' }, contentStyle: { backgroundColor: colors.background.secondary } }}>
                {authenticated ? <><Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} /><Stack.Screen name="CRM" component={CRMScreen} options={{ title: "Clientes" }} /><Stack.Screen name="Inventory" component={InventoryScreen} options={{ title: "Inventario" }} /><Stack.Screen name="Sales" component={SalesScreen} options={{ title: "Ventas" }} /><Stack.Screen name="Purchasing" component={PurchasingScreen} options={{ title: "Proveedores" }} /></> :
                  <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />}
              </Stack.Navigator>
            </NavigationContainer>
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
