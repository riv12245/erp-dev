import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing, elevation as elevationTokens } from '@erp/design-tokens';

export interface CardProps {
  readonly children: React.ReactNode;
  readonly elevation?: keyof typeof elevationTokens;
  readonly style?: ViewStyle;
  readonly padded?: boolean;
  readonly testID?: string;
}

export function Card(props: CardProps): React.JSX.Element {
  return (
    <View testID={props.testID} style={[styles.card, props.padded === false ? undefined : styles.padded, elevationTokens[props.elevation ?? 'sm'], props.style]}>
      {props.children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.elevated,
    borderRadius: radius.lg,
  },
  padded: {
    padding: spacing.lg,
  },
});

export default Card;