import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize } from '@erp/design-tokens';
import { Input } from './Input.js';
import { Select } from './Select.js';
import { Checkbox } from './Checkbox.js';

export interface FormFieldProps {
  readonly label: string;
  readonly error?: string;
  readonly required?: boolean;
  readonly hint?: string;
  readonly children?: React.ReactNode;
}

/** Renders a label, control, and validation message in an accessible group. */
export function FormField(props: FormFieldProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {props.label}
        {props.required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {props.children}
      {props.error ? <Text style={styles.error}>{props.error}</Text> : null}
      {!props.error && props.hint ? <Text style={styles.hint}>{props.hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  required: {
    color: colors.semantic.danger,
  },
  error: {
    fontSize: fontSize.xs,
    color: colors.semantic.danger,
    marginTop: spacing.xs,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.text.muted,
    marginTop: spacing.xs,
  },
});

export { Input, Select, Checkbox };
export default FormField;