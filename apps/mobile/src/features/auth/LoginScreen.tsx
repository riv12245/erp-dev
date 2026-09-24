import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Input } from '@erp/ui';
import { colors } from '@erp/design-tokens';
import { useAuth } from '../../hooks/useAuth';

export function LoginScreen(): React.JSX.Element {
  const [email, setEmail] = React.useState('');
  const [tenantId, setTenantId] = React.useState('');
  const [password, setPassword] = React.useState('');
  const { login, isLoading, error } = useAuth();
  const submit = async () => {
    if (!isLoading && email.trim() && tenantId.trim() && password) {
      await login(email.trim(), password, tenantId.trim());
    }
  };
  return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.brand}>
        <View style={styles.brandMark}><Text style={styles.brandLetter}>E</Text></View>
        <View><Text style={styles.brandName}>ERP-DEV</Text><Text style={styles.brandSub}>Enterprise workspace</Text></View>
      </View>
      <View style={styles.headingGroup}>
        <Text style={styles.eyebrow}>ACCESO A TU EMPRESA</Text>
        <Text style={styles.title}>Bienvenido de nuevo</Text>
        <Text style={styles.subtitle}>Ingresa tus credenciales para continuar con tus operaciones.</Text>
      </View>
      <View style={styles.form}>
        <Input label="Identificador de empresa" value={tenantId} onChangeText={setTenantId} placeholder="Espacio de trabajo" autoCapitalize="none" disabled={isLoading}/>
        <Input label="Correo electrónico" value={email} onChangeText={setEmail} placeholder="nombre@empresa.com" autoCapitalize="none" disabled={isLoading}/>
        <Input label="Contraseña" value={password} onChangeText={setPassword} placeholder="Ingresa tu contraseña" secureTextEntry disabled={isLoading}/>
        {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <View style={styles.submit}><Button label={isLoading ? 'Iniciando sesión…' : 'Iniciar sesión →'} loading={isLoading} disabled={isLoading || !email.trim() || !tenantId.trim() || !password} onPress={() => { void submit(); }}/></View>
      </View>
      <Text style={styles.note}>Si no tienes acceso, solicita una cuenta al administrador de tu empresa.</Text>
    </ScrollView>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.secondary },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 36, justifyContent: 'center' },
  brand: { flexDirection: 'row', gap: 11, alignItems: 'center', marginBottom: 56 },
  brandMark: { width: 42, height: 42, borderRadius: 10, backgroundColor: colors.neutral.slate900, alignItems: 'center', justifyContent: 'center' },
  brandLetter: { color: '#ffffff', fontSize: 21, fontWeight: '800' },
  brandName: { color: colors.text.primary, fontSize: 17, fontWeight: '800' },
  brandSub: { color: colors.text.secondary, fontSize: 11, marginTop: 2 },
  headingGroup: { gap: 10, marginBottom: 30 },
  eyebrow: { color: colors.primary[700], fontSize: 10, letterSpacing: 1.1, fontWeight: '700' },
  title: { color: colors.text.primary, fontWeight: '700', fontSize: 29, lineHeight: 35 },
  subtitle: { color: colors.text.secondary, lineHeight: 21, fontSize: 13 },
  form: { gap: 17 },
  submit: { marginTop: 9 },
  error: { color: colors.semantic.danger, backgroundColor: '#fff0f1', padding: 12, borderRadius: 7, fontSize: 12 },
  note: { borderTopWidth: 1, borderColor: colors.border.default, color: colors.text.muted, fontSize: 11, lineHeight: 18, paddingTop: 20, marginTop: 34 },
});
