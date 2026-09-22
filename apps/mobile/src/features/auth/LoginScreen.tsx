import React from 'react';
import { Button, Input, Card } from '@erp/ui';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../app/App';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props): React.JSX.Element {
  const [email, setEmail] = React.useState('');
  const [tenantId, setTenantId] = React.useState('');
  const [password, setPassword] = React.useState('');
  const { login, isLoading, error } = useAuth();

  const handleSubmit = async () => {
    if (await login(email, password, tenantId)) navigation.navigate('Dashboard');
  };

  return (
    <View style={styles.container}>
      <Card padded>
        <Text style={styles.title}>Sign in</Text>
        <Input label="Tenant" value={tenantId} onChangeText={setTenantId} placeholder="tenant-acme" autoCapitalize="none" />
        <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" />
        <Input label="Password" value={password} onChangeText={setPassword} placeholder="Enter your password" secureTextEntry />
        {error ? <Text style={styles.error} role="alert">{error}</Text> : null}
        <Button label={isLoading ? 'Signing in...' : 'Sign in'} loading={isLoading} disabled={isLoading} onPress={handleSubmit} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  error: {
    color: '#dc2626',
  },
});