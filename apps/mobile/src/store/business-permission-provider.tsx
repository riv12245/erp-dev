import React from 'react';
import { Text, View } from 'react-native';
import { Button } from '@erp/ui';
import { businessError, businessSessionKey, hydrateBusinessIdentity } from '@erp/api-client';
import { apiClient } from '../services/api-client';
import { useAuthStore } from './auth-store';
import { usePermissionStore } from './permission-store';

export function BusinessPermissionProvider({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  const token = useAuthStore(state => state.accessToken);
  const epoch = useAuthStore(state => state.sessionEpoch());
  const tenantId = useAuthStore(state => state.tenantId);
  const userId = useAuthStore(state => state.user?.id);
  const identityKey = businessSessionKey(epoch, tenantId, userId);
  const [readyIdentity, setReadyIdentity] = React.useState('');
  const [checkedToken, setCheckedToken] = React.useState<string | null>(null);
  const [error, setError] = React.useState('');
  const [retry, setRetry] = React.useState(0);
  const hydratedIdentity = React.useRef('');
  React.useEffect(() => {
    const controller = new AbortController();
    // A token rotation is the same session: keep its forms, request keys and principal alive.
    if (hydratedIdentity.current !== identityKey || !token) {
      usePermissionStore.getState().clear(); setReadyIdentity('');
    }
    setCheckedToken(null); setError('');
    if (token) void hydrateBusinessIdentity(apiClient, {
      signal: controller.signal, epoch, getEpoch: () => useAuthStore.getState().sessionEpoch(),
      apply: identity => {
        usePermissionStore.getState().setIdentity(identity);
        hydratedIdentity.current = identityKey; setReadyIdentity(identityKey); setCheckedToken(token);
      },
    }).catch(reason => { if (!controller.signal.aborted) setError(businessError(reason)); });
    return () => controller.abort();
  }, [token, epoch, identityKey, retry]);
  if (!token) return <>{children}</>;
  const ready = readyIdentity === identityKey;
  const blocked = checkedToken !== token || !!error;
  return <View style={{ flex: 1 }}>
    {blocked ? <View style={{ padding: 24, gap: 12 }}><Text>{error || 'Loading account permissions…'}</Text>{error ? <Button label="Retry permissions" onPress={() => setRetry(value => value + 1)} /> : null}<Button label="Sign out" variant="secondary" onPress={() => { void useAuthStore.getState().logout(); }} /></View> : null}
    <View style={{ flex: 1, display: blocked ? 'none' : 'flex' }} pointerEvents={blocked ? 'none' : 'auto'} accessibilityElementsHidden={blocked} importantForAccessibility={blocked ? 'no-hide-descendants' : 'auto'}>
      {ready ? <React.Fragment key={identityKey}>{children}</React.Fragment> : null}
    </View>
  </View>;
}
