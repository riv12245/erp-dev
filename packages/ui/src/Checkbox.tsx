import React from 'react';
import { Pressable, View, Text, StyleSheet, Platform } from 'react-native';
import { colors, radius, fontSize, spacing } from '@erp/design-tokens';

export interface CheckboxProps {
  readonly checked: boolean;
  readonly onValueChange: (checked: boolean) => void;
  readonly label?: string;
  readonly disabled?: boolean;
  readonly testID?: string;
}

export function Checkbox(props: CheckboxProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole={Platform.OS === 'web' ? 'checkbox' : 'checkbox'}
      accessibilityState={{ checked: props.checked, disabled: props.disabled }}
      accessibilityLabel={props.label}
      disabled={props.disabled}
      onPress={() => props.onValueChange(!props.checked)}
      style={styles.row}
      testID={props.testID}
    >
      <View style={[styles.box, props.checked && styles.boxChecked]}>
        {props.checked ? <Text style={styles.tick}>{'\u2713'}</Text> : null}
      </View>
      {props.label ? <Text style={styles.label}>{props.label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  box: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: colors.border.strong,
    borderRadius: radius.xs,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  boxChecked: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  tick: {
    color: colors.text.inverse,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  label: {
    marginLeft: spacing.sm,
    color: colors.text.primary,
    fontSize: fontSize.md,
  },
});

export default Checkbox;