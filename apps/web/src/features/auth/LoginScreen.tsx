import React from 'react';
import { Button, Input, Card } from '@erp/ui';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { StyleSheet, Text } from 'react-native';

export function LoginScreen(): React.JSX.Element {
  const [email, setEmail] = React.useState('');
  const [tenantId, setTenantId] = React.useState('');
  const [password, setPassword] = React.useState('');
  const { login, isLoading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (await login(email, password, tenantId)) navigate('/');
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Login form" style={styles.form}>
      <Card padded>
        <Text style={styles.title}>Sign in</Text>
        <Input label="Tenant" value={tenantId} onChangeText={setTenantId} placeholder="tenant-acme" autoCapitalize="none" />
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          secureTextEntry
        />
        {error ? <Text style={styles.error} role="alert">{error}</Text> : null}
        <Button label={isLoading ? 'Signing in...' : 'Sign in'} loading={isLoading} disabled={isLoading} onPress={() => { void handleSubmit(); }} />
      </Card>
    </form>
  );
}

const styles = StyleSheet.create({
  form: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  error: {
    color: '#dc2626',
  },
});