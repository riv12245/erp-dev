import React from 'react';
import { Card, EmptyState } from '@erp/ui';
import { StyleSheet, View } from 'react-native';

export function CRMScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Card padded>
        <EmptyState title="CRM" description="Customers, leads and opportunities will live here." />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f8fafc' },
});