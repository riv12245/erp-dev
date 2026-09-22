import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize } from '@erp/design-tokens';

export interface LoadingStateProps {
  readonly label?: string;
}

export function LoadingState(props: LoadingStateProps): React.JSX.Element {
  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel={props.label ?? 'Loading'}>
      <ActivityIndicator size="large" color={colors.primary[600]} />
      {props.label ? <Text style={styles.label}>{props.label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
    gap: spacing.md,
  },
  label: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
  },
});

export default LoadingState;