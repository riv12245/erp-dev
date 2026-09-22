import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize } from '@erp/design-tokens';
import { Button } from './Button.js';

export interface ErrorStateProps {
  readonly message: string;
  readonly details?: string;
  readonly onRetry?: () => void;
}

export function ErrorState(props: ErrorStateProps): React.JSX.Element {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.icon}>&#9888;</Text>
      <Text style={styles.title}>{props.message}</Text>
      {props.details ? <Text style={styles.details}>{props.details}</Text> : null}
      {props.onRetry ? <Button label="Retry" onPress={props.onRetry} variant="secondary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: spacing['2xl'],
    gap: spacing.sm,
  },
  icon: {
    fontSize: fontSize['3xl'],
    color: colors.semantic.danger,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
  details: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

export default ErrorState;