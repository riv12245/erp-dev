import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, TenantProvider, PermissionProvider } from '../store/providers';
import { LoginScreen } from '../features/auth/LoginScreen';
import { DashboardScreen } from '../features/dashboard/Index';
import { enableScreens } from 'react-native-screens';
import { useAuthStore } from '../store/auth-store';

enableScreens();

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
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
              <Stack.Navigator>
                {authenticated ? <Stack.Screen name="Dashboard" component={DashboardScreen} /> :
                  <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />}
              </Stack.Navigator>
            </NavigationContainer>
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
