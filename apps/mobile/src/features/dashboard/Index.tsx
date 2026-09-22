import React from 'react';
import { Card, Button } from '@erp/ui';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import type { RootStackParamList } from '../../app/App';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export function DashboardScreen({ navigation }: Props): React.JSX.Element {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <Card padded>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Welcome{user?.name ? `, ${user.name}` : ''}.</Text>
        <Button label="Sign out" variant="secondary" onPress={handleLogout} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f8fafc' },
  title: { fontSize: 24, fontWeight: '600' },
  subtitle: { fontSize: 16, marginBottom: 16, color: '#475569' },
});