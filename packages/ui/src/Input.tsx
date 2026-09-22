import React from 'react';
import { TextInput, StyleSheet, View, Text, Platform } from 'react-native';
import { colors, radius, spacing, fontSize } from '@erp/design-tokens';

export interface InputProps {
  readonly value: string;
  readonly onChangeText: (value: string) => void;
  readonly placeholder?: string;
  readonly label?: string;
  readonly error?: string;
  readonly secureTextEntry?: boolean;
  readonly disabled?: boolean;
  readonly maxLength?: number;
  readonly autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  readonly testID?: string;
  readonly name?: string;
}

/** Base Input primitive shared between web and native. */
export function Input(props: InputProps): React.JSX.Element {
  const { label, error, value, onChangeText, name, ...inputProps } = props;
  const hasError = Boolean(error);
  const accessibilityLabel = label ?? props.placeholder ?? name;
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        {...inputProps}
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel={accessibilityLabel}
        accessible
        style={[styles.input, hasError && styles.inputError, props.disabled && styles.disabled]}
        placeholderTextColor={colors.text.muted}
        editable={!props.disabled}
        testID={props.testID ?? name}
      />
      {hasError ? (
        <Text accessibilityRole={Platform.OS === 'web' ? 'alert' : 'text'} style={styles.errorText}>
          {error}
        </Text>
      ) : null}
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
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.primary,
    fontSize: fontSize.md,
    color: colors.text.primary,
    minHeight: 44,
  },
  inputError: {
    borderColor: colors.border.error,
  },
  disabled: {
    opacity: 0.5,
  },
  errorText: {
    color: colors.semantic.danger,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
});

export default Input;