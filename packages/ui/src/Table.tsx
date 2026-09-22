import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors, spacing, fontSize } from '@erp/design-tokens';

export interface Column<T> {
  readonly key: string;
  readonly header: string;
  readonly render?: (row: T) => React.ReactNode;
  readonly accessor?: (row: T) => unknown;
  readonly width?: number | string;
}

export interface TableProps<T> {
  readonly columns: readonly Column<T>[];
  readonly rows: readonly T[];
  readonly rowKey: (row: T) => string;
  readonly emptyLabel?: string;
  readonly caption?: string;
}

/**
 * Table abstraction. The web application uses a denser specialized
 * DataGrid component; this primitive covers shared, simple tables.
 */
export function Table<T>(props: TableProps<T>): React.JSX.Element {
  if (props.rows.length === 0) {
    return (
      <View accessibilityRole="text" style={styles.empty}>
        <Text style={styles.emptyText}>{props.emptyLabel ?? 'No data'}</Text>
      </View>
    );
  }
  return (
    <View role={Platform.OS === 'web' ? 'table' : undefined} aria-label={props.caption}>
      <View role={Platform.OS === 'web' ? 'rowgroup' : undefined} accessibilityRole="header" style={styles.headerRow}>
        {props.columns.map((column) => (
          <View key={column.key} role={Platform.OS === 'web' ? 'columnheader' : undefined} style={[styles.cell, column.width != null ? { width: column.width as number } : styles.grow]}>
            <Text style={styles.headerText}>{column.header}</Text>
          </View>
        ))}
      </View>
      <View role={Platform.OS === 'web' ? 'rowgroup' : undefined}>
        {props.rows.map((row) => (
          <View key={props.rowKey(row)} role={Platform.OS === 'web' ? 'row' : undefined} style={styles.row}>
            {props.columns.map((column) => {
              const content = column.render ? column.render(row) : column.accessor ? String(column.accessor(row)) : '';
              return (
                <View key={column.key} role={Platform.OS === 'web' ? 'cell' : undefined} style={[styles.cell, column.width != null ? { width: column.width as number } : styles.grow]}>
                  <Text style={styles.cellText}>{content}</Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: colors.border.strong,
    backgroundColor: colors.background.secondary,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    minHeight: 44,
  },
  cell: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  grow: {
    flex: 1,
  },
  headerText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  cellText: {
    fontSize: fontSize.sm,
    color: colors.text.primary,
  },
  empty: {
    padding: spacing['2xl'],
    alignItems: 'center',
  },
  emptyText: {
    color: colors.text.muted,
    fontSize: fontSize.md,
  },
});

export default Table;