import React from 'react';
import { Modal as RNModal, View, StyleSheet, Pressable } from 'react-native';
import { colors, radius, spacing, elevation } from '@erp/design-tokens';

export interface ModalProps {
  readonly visible: boolean;
  readonly onClose?: () => void;
  readonly children: React.ReactNode;
  readonly title?: string;
  readonly dismissible?: boolean;
  readonly testID?: string;
}

export function Modal(props: ModalProps): React.JSX.Element | null {
  if (!props.visible) return null;
  return (
    <RNModal visible transparent animationType="fade" onRequestClose={props.onClose} testID={props.testID}>
      <Pressable style={styles.backdrop} onPress={props.dismissible ? props.onClose : undefined} accessibilityViewIsModal>
        <View style={styles.dialog} onStartShouldSetResponder={() => true}>
          {props.children}
        </View>
      </Pressable>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.background.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.background.elevated,
    borderRadius: radius.lg,
    padding: spacing.xl,
    ...elevation.lg,
  },
});

export default Modal;