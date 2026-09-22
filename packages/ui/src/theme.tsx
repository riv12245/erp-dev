import React from 'react';
import { StyleSheet, View } from 'react-native';

export interface ThemeProviderProps {
  readonly children: React.ReactNode;
}

/**
 * Theme provider placeholder. Design tokens are imported statically from
 * @erp/design-tokens; a runtime theme (light/dark/tenant brand) can be
 * layered on top without breaking component contracts.
 */
export function ThemeProvider(props: ThemeProviderProps): React.JSX.Element {
  return <View style={styles.root}>{props.children}</View>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default ThemeProvider;