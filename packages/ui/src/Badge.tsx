import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, fontSize, spacing } from '@erp/design-tokens';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps {
  readonly label: string;
  readonly tone?: BadgeTone;
  readonly pill?: boolean;
}

const toneColors: Record<BadgeTone, { background: string; foreground: string }> = {
  neutral: { background: colors.neutral.slate200, foreground: colors.neutral.slate700 },
  success: { background: '#dcfce7', foreground: colors.semantic.success },
  warning: { background: '#fef3c7', foreground: colors.semantic.warning },
  danger: { background: '#fee2e2', foreground: colors.semantic.danger },
  info: { background: '#e0f2fe', foreground: colors.semantic.info },
};

export function Badge(props: BadgeProps): React.JSX.Element {
  const palette = toneColors[props.tone ?? 'neutral'];
  return (
    <View style={[styles.badge, { backgroundColor: palette.background }, props.pill && styles.pill]}>
      <Text style={[styles.label, { color: palette.foreground }]}>{props.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    alignSelf: 'flex-start',
  },
  pill: {
    borderRadius: radius.full,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});

export default Badge;