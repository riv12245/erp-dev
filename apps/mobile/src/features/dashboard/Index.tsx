import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createBusinessClient, businessError } from '@erp/api-client';
import type { BusinessCompany } from '@erp/api-client';
import { colors } from '@erp/design-tokens';
import type { RootStackParamList } from '../../app/App';
import { apiClient } from '../../services/api-client';
import { useAuth } from '../../hooks/useAuth';

const business = createBusinessClient(apiClient);
type Screen = Exclude<keyof RootStackParamList, 'Login'>;
const modules: readonly { target: Screen; number: string; label: string; hint: string }[] = [
  { target: 'Inventory', number: '01', label: 'Inventario', hint: 'Productos y existencias' },
  { target: 'Sales', number: '02', label: 'Ventas', hint: 'Borradores de pedidos' },
  { target: 'CRM', number: '03', label: 'Clientes', hint: 'Relaciones comerciales' },
  { target: 'Purchasing', number: '04', label: 'Proveedores', hint: 'Catálogo de compras' },
];

export function DashboardScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, logout } = useAuth();
  const [companies, setCompanies] = React.useState<readonly BusinessCompany[] | null>(null);
  const [error, setError] = React.useState('');
  const [revision, setRevision] = React.useState(0);
  const [moreOpen, setMoreOpen] = React.useState(false);
  React.useEffect(() => {
    const controller = new AbortController();
    setCompanies(null); setError('');
    void business.companies(controller.signal).then(result => {
      if (!controller.signal.aborted) setCompanies(result);
    }).catch(reason => { if (!controller.signal.aborted) setError(businessError(reason)); });
    return () => controller.abort();
  }, [revision]);
  const name = (user?.name || user?.email || 'equipo').split('@')[0];
  const open = (target: Screen) => { setMoreOpen(false); navigation.navigate(target); };
  return <View style={styles.root}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <View style={styles.brand}><Text style={styles.brandLetter}>E</Text></View>
        <View style={styles.headerText}><Text style={styles.brandName}>ERP-DEV</Text><Text style={styles.brandSubtitle}>Espacio de trabajo</Text></View>
        <View style={styles.avatar}><Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text></View>
      </View>
      <Text style={styles.eyebrow}>RESUMEN OPERATIVO</Text>
      <Text style={styles.heading}>Buen día, {name}</Text>
      <Text style={styles.subtitle}>Tus herramientas de trabajo, siempre a la mano.</Text>
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>ERP-DEV · OPERACIONES</Text>
        <Text style={styles.heroTitle}>Administra tu negocio desde donde estés.</Text>
        <Text style={styles.heroBody}>Consulta productos, clientes, proveedores y borradores de venta de las empresas a las que tienes acceso.</Text>
        <Pressable onPress={() => open('Inventory')} accessibilityRole="button" style={styles.heroAction}><Text style={styles.heroActionText}>Abrir inventario  →</Text></Pressable>
      </View>
      <View style={styles.sectionTitleRow}><Text style={styles.sectionTitle}>Accesos rápidos</Text><Text style={styles.sectionHint}>Módulos</Text></View>
      <View style={styles.grid}>
        {modules.map(module => <Pressable key={module.target} accessibilityRole="button" accessibilityLabel={'Abrir ' + module.label} style={styles.tile} onPress={() => open(module.target)}>
          <View style={styles.numberBox}><Text style={styles.number}>{module.number}</Text></View>
          <Text style={styles.tileName}>{module.label}</Text>
          <Text style={styles.tileHint}>{module.hint}</Text>
          <Text style={styles.tileArrow}>↗</Text>
        </Pressable>)}
      </View>
      <View style={styles.sectionTitleRow}><Text style={styles.sectionTitle}>Empresas autorizadas</Text></View>
      <View style={styles.companyCard}>
        {companies === null && !error && <ActivityIndicator accessibilityLabel="Cargando empresas" color={colors.primary[600]}/>}
        {error ? <View><Text style={styles.error} accessibilityRole="alert">{error}</Text><Pressable accessibilityRole="button" onPress={() => setRevision(value => value + 1)}><Text style={styles.retry}>Reintentar</Text></Pressable></View> : null}
        {companies?.length === 0 && <Text style={styles.companyHelp}>Aún no tienes una empresa autorizada. Solicita acceso o créala desde un módulo si cuentas con el permiso necesario.</Text>}
        {companies?.map(company => <View style={styles.companyRow} key={company.id}><View style={styles.companyAvatar}><Text style={styles.companyAvatarText}>{company.name.slice(0, 1).toUpperCase()}</Text></View><Text style={styles.companyName} numberOfLines={1}>{company.name}</Text><Text style={styles.companyCurrency}>{company.defaultCurrency}</Text></View>)}
        <Text style={styles.companyHelp}>Selecciona la empresa al entrar en cada módulo.</Text>
      </View>
      <Text style={styles.disclaimer}>Las ventas disponibles son borradores. No reservan inventario ni confirman pagos o facturas.</Text>
    </ScrollView>
    {moreOpen && <View style={styles.morePanel}>
      <Pressable accessibilityRole="button" onPress={() => open('CRM')} style={styles.moreItem}><Text style={styles.moreLabel}>Clientes</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => open('Purchasing')} style={styles.moreItem}><Text style={styles.moreLabel}>Proveedores</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => { void logout(); }} style={styles.moreItem}><Text style={styles.error}>Cerrar sesión</Text></Pressable>
    </View>}
    <View style={styles.bottomBar}>
      <Pressable style={styles.bottomItem} accessibilityRole="button" accessibilityState={{ selected: true }} onPress={() => setMoreOpen(false)}><Text style={styles.bottomActive}>⌂</Text><Text style={styles.bottomLabelActive}>Inicio</Text></Pressable>
      <Pressable style={styles.bottomItem} accessibilityRole="button" onPress={() => open('Sales')}><Text style={styles.bottomIcon}>▤</Text><Text style={styles.bottomLabel}>Ventas</Text></Pressable>
      <Pressable style={styles.bottomItem} accessibilityRole="button" onPress={() => open('Inventory')}><Text style={styles.bottomIcon}>▦</Text><Text style={styles.bottomLabel}>Inventario</Text></Pressable>
      <Pressable style={styles.bottomItem} accessibilityRole="button" accessibilityState={{ expanded: moreOpen }} onPress={() => setMoreOpen(value => !value)}><Text style={styles.bottomIcon}>☰</Text><Text style={styles.bottomLabel}>Más</Text></Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.secondary },
  content: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 24, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 22, gap: 10 },
  brand: { width: 37, height: 37, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neutral.slate900 },
  brandLetter: { color: '#fff', fontWeight: '800', fontSize: 19 },
  headerText: { flex: 1, gap: 3 }, brandName: { color: colors.text.primary, fontSize: 15, fontWeight: '800' },
  brandSubtitle: { color: colors.text.secondary, fontSize: 11 },
  avatar: { width: 33, height: 33, borderRadius: 17, backgroundColor: '#d5f4ea', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary[700], fontWeight: '700', fontSize: 13 },
  eyebrow: { color: colors.primary[700], fontWeight: '700', fontSize: 10, letterSpacing: 1.1 },
  heading: { color: colors.text.primary, fontSize: 26, fontWeight: '750', marginTop: 3 },
  subtitle: { color: colors.text.secondary, fontSize: 13, marginBottom: 12, lineHeight: 20 },
  hero: { backgroundColor: colors.neutral.slate900, borderRadius: 15, padding: 22, gap: 11, marginBottom: 20 },
  heroEyebrow: { color: '#77d7c2', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '750', maxWidth: 285, lineHeight: 28 },
  heroBody: { color: '#bfd0d2', fontSize: 12, lineHeight: 19 },
  heroAction: { marginTop: 6, backgroundColor: colors.primary[600], borderRadius: 8, paddingVertical: 13, paddingHorizontal: 15, alignSelf: 'flex-start' },
  heroActionText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2, marginBottom: 5 },
  sectionTitle: { color: colors.text.primary, fontSize: 16, fontWeight: '750' }, sectionHint: { color: colors.text.muted, fontSize: 11 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  tile: { width: '48%', flexGrow: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border.default, borderRadius: 12, padding: 15, minHeight: 152 },
  numberBox: { width: 34, height: 34, backgroundColor: '#e8f7f1', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  number: { color: colors.primary[700], fontSize: 12, fontWeight: '700' },
  tileName: { color: colors.text.primary, fontSize: 14, fontWeight: '700' },
  tileHint: { color: colors.text.muted, fontSize: 11, marginTop: 4 },
  tileArrow: { position: 'absolute', right: 15, top: 16, color: colors.primary[700], fontSize: 17 },
  companyCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.border.default, padding: 15, gap: 11 },
  companyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  companyAvatar: { width: 30, height: 30, borderRadius: 7, backgroundColor: '#e8f7f1', alignItems: 'center', justifyContent: 'center' },
  companyAvatarText: { color: colors.primary[700], fontWeight: '700', fontSize: 12 },
  companyName: { flex: 1, color: colors.text.primary, fontWeight: '600', fontSize: 12 },
  companyCurrency: { color: colors.text.muted, fontSize: 11 },
  companyHelp: { color: colors.text.muted, fontSize: 11, lineHeight: 17 },
  disclaimer: { color: colors.text.muted, fontSize: 11, lineHeight: 17, marginTop: 10 },
  error: { color: colors.semantic.danger, fontSize: 12 }, retry: { color: colors.primary[700], marginTop: 8, fontWeight: '700' },
  bottomBar: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.border.default, paddingTop: 8, paddingBottom: 9 },
  bottomItem: { flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center', gap: 2 },
  bottomActive: { color: colors.primary[700], fontSize: 23, fontWeight: '800' },
  bottomIcon: { color: colors.text.muted, fontSize: 20, fontWeight: '600' },
  bottomLabel: { color: colors.text.muted, fontSize: 10, fontWeight: '600' },
  bottomLabelActive: { color: colors.primary[700], fontSize: 10, fontWeight: '700' },
  morePanel: { backgroundColor: '#fff', borderTopWidth: 1, borderColor: colors.border.default, paddingHorizontal: 20, paddingVertical: 8 },
  moreItem: { minHeight: 45, justifyContent: 'center', borderBottomWidth: 1, borderColor: colors.border.default },
  moreLabel: { color: colors.text.primary, fontSize: 13, fontWeight: '600' },
});
