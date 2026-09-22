import React from 'react';
import { Modal as RNModal, View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, fontSize } from '@erp/design-tokens';

export interface DrawerProps {
  readonly visible: boolean;
  readonly onClose?: () => void;
  readonly title?: string;
  readonly children: React.ReactNode;
}

export function Drawer(props: DrawerProps): React.JSX.Element | null {
  if (!props.visible) return null;
  return (
    <RNModal visible transparent animationType="slide" onRequestClose={props.onClose}>
      <View style={styles.backdrop} onStartShouldSetResponder={() => true}>
        <View style={styles.panel}>
          <View onStartShouldSetResponder={() => true} style={styles.content}>
            {props.title ? <Text style={styles.title}>{props.title}</Text> : null}
            <ScrollView keyboardShouldPersistTaps="handled">{props.children}</ScrollView>
          </View>
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.background.overlay,
    justifyContent: 'flex-end',
  },
  panel: {
    maxHeight: '85%',
    backgroundColor: colors.background.elevated,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  content: {
    padding: spacing.xl,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
});

export default Drawer;