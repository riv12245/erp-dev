import React from 'react';
import { Card, EmptyState } from '@erp/ui';
import { StyleSheet, View } from 'react-native';

export function InventoryScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Card padded>
        <EmptyState title="Inventory" description="Products and stock will live here." />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f8fafc' },
});