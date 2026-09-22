import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, TenantProvider, PermissionProvider } from '../store/providers';
import { LoginScreen } from '../features/auth/LoginScreen';
import { DashboardScreen } from '../features/dashboard/Index';
import { enableScreens } from 'react-native-screens';

enableScreens();

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <NavigationContainer>
              <Stack.Navigator initialRouteName="Login">
                <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Dashboard" component={DashboardScreen} />
              </Stack.Navigator>
            </NavigationContainer>
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}