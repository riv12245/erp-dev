import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { colors, spacing, fontSize } from '@erp/design-tokens';

export interface TabItem {
  readonly key: string;
  readonly label: string;
}

export interface TabsProps {
  readonly items: readonly TabItem[];
  readonly activeKey: string;
  readonly onChange: (key: string) => void;
  readonly accessibilityLabel?: string;
}

export function Tabs(props: TabsProps): React.JSX.Element {
  return (
    <View style={styles.container} accessibilityRole="tablist">
      {props.items.map((item) => {
        const active = item.key === props.activeKey;
        return (
          <Pressable
            key={item.key}
            accessibilityRole={Platform.OS === 'web' ? 'tab' : 'tab'}
            accessibilityState={{ selected: active }}
            onPress={() => props.onChange(item.key)}
            style={[styles.tab, active && styles.tabActive]}
          >
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    gap: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary[600],
  },
  tabLabel: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
  },
  tabLabelActive: {
    color: colors.primary[600],
    fontWeight: '600',
  },
});

export default Tabs;