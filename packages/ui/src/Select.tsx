import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, fontSize } from '@erp/design-tokens';
import { Input } from './Input.js';

export interface Option {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface SelectProps {
  readonly value?: string;
  readonly placeholder?: string;
  readonly label?: string;
  readonly options: readonly Option[];
  readonly disabled?: boolean;
  readonly onChange?: (value: string) => void;
}

/**
 * Base Select primitive. Uses a native picker on mobile and a styled
 * dropdown on web via platform files.
 */
export function Select(props: SelectProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      {props.label ? <Text style={styles.label}>{props.label}</Text> : null}
      <View style={[styles.wrapper, props.disabled && styles.disabled]}>
        <Input
          value={props.options.find((option) => option.value === props.value)?.label ?? ''}
          onChangeText={() => undefined}
          placeholder={props.placeholder}
          disabled={props.disabled}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  wrapper: {
    borderRadius: radius.md,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default Select;