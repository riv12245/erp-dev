import React from 'react';
import { Pressable, Text, StyleSheet, View, ActivityIndicator, Platform } from 'react-native';
import { colors, radius, spacing, fontSize, fontWeight } from '@erp/design-tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  readonly label?: string;
  readonly children?: React.ReactNode;
  readonly onPress?: () => void;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly testID?: string;
  readonly accessibilityLabel?: string;
}

const variantStyles: Record<ButtonVariant, Record<string, unknown>> = {
  primary: { backgroundColor: colors.primary[600] },
  secondary: { backgroundColor: colors.neutral.slate200 },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border.strong },
  danger: { backgroundColor: colors.semantic.danger },
  ghost: { backgroundColor: 'transparent' },
};

const textStyles: Record<ButtonVariant, Record<string, unknown>> = {
  primary: { color: colors.text.inverse },
  secondary: { color: colors.text.primary },
  outline: { color: colors.text.primary },
  danger: { color: colors.text.inverse },
  ghost: { color: colors.primary[700] },
};

const sizeStyles: Record<ButtonSize, Record<string, unknown>> = {
  sm: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, minHeight: 32 },
  md: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, minHeight: 44 },
  lg: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, minHeight: 52 },
};

const sizeFont: Record<ButtonSize, number> = {
  sm: fontSize.sm,
  md: fontSize.md,
  lg: fontSize.lg,
};

/** Base Button primitive shared between web and native. */
export function Button({ label, children, onPress, variant = 'primary', size = 'md', disabled = false, loading = false, testID, accessibilityLabel }: ButtonProps): React.JSX.Element {
  const text = label ?? children;
  return (
    <Pressable
      testID={testID}
      accessibilityRole={Platform.OS === 'web' ? 'button' : 'button'}
      accessibilityLabel={accessibilityLabel ?? (typeof text === 'string' ? text : undefined)}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={[styles.base, variantStyles[variant], sizeStyles[size], (disabled || loading) && styles.disabled]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? colors.text.inverse : colors.primary[600]} size="small" />
      ) : (
        <Text style={[styles.text, textStyles[variant], { fontSize: sizeFont[size] }]}>{text}</Text>
      )}
      {children && !loading && <View style={styles.childrenWrap}>{children}</View>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  text: {
    fontWeight: fontWeight.medium,
  },
  disabled: {
    opacity: 0.5,
  },
  childrenWrap: {
    marginLeft: spacing.sm,
  },
});

export default Button;