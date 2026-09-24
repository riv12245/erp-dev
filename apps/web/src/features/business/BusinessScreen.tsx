import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Input } from '@erp/ui';
import { colors } from '@erp/design-tokens';
import { applyBusinessResult, businessDefinitions, businessError, businessFormBody, businessFormValues, businessRecordId, businessRecordLabel, businessSessionKey, companyFields, createBusinessClient, salesDraftLines } from '@erp/api-client';
import type { BusinessCompany, BusinessField, BusinessPage, BusinessRecord, BusinessResource, SalesDraftLineInput } from '@erp/api-client';
import { apiClient } from '../../services/api-client';
import { useAuthStore } from '../../store/auth-store';
import { usePermissions } from '../../hooks/usePermissions';

const business = createBusinessClient(apiClient);
const text = (value: unknown): string => typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '—');
const useRequestSignal = () => {
  const controllers = React.useRef(new Set<AbortController>());
  React.useEffect(() => () => { for (const controller of controllers.current) controller.abort(); controllers.current.clear(); }, []);
  return () => { const controller = new AbortController(); controllers.current.add(controller); return { signal: controller.signal, release: () => controllers.current.delete(controller) }; };
};
function RefreshSessionButton(): React.JSX.Element {
  const requestSignal = useRequestSignal();
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const refresh = async () => {
    const { signal, release } = requestSignal();
    setBusy(true); setMessage('');
    try {
      // GET may refresh credentials. Retrying a business write remains an explicit user action.
      await apiClient.get('/api/v1/auth/me', { signal });
      if (!signal.aborted) setMessage('Session checked. Review the form and confirm again to retry.');
    } catch (reason) { if (!signal.aborted) setMessage(businessError(reason)); }
    finally { release(); if (!signal.aborted) setBusy(false); }
  };
  return <View style={styles.section}><Button label="Refresh session" variant="secondary" loading={busy} onPress={() => { void refresh(); }} />{message ? <Text accessibilityLiveRegion="polite">{message}</Text> : null}</View>;
}
function Lookup({ companyId, resource, value, onChange, disabled }: { companyId: string; resource: 'products' | 'warehouses' | 'customers'; value: string; onChange: (value: string) => void; disabled?: boolean }): React.JSX.Element {
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [data, setData] = React.useState<BusinessPage | null>(null);
  const [error, setError] = React.useState('');
  const [retry, setRetry] = React.useState(0);
  React.useEffect(() => {
    const controller = new AbortController(); setData(null); setError('');
    void business.list(companyId, resource, { page, limit: 8, [businessDefinitions[resource].search ?? 'q']: search.trim() || undefined }, controller.signal).then(result => { if (!controller.signal.aborted) setData(result); }).catch(reason => { if (!controller.signal.aborted) setError(businessError(reason)); });
    return () => controller.abort();
  }, [companyId, resource, page, search, retry]);
  return <View style={styles.section}>
    <Input label={`Find ${resource}`} value={search} disabled={disabled} onChangeText={next => { setSearch(next); setPage(1); }} />
    {value ? <Text>Selected: {data?.items.find(item => businessRecordId(item) === value)?.name ? text(data.items.find(item => businessRecordId(item) === value)?.name) : value}</Text> : <Text>No selection</Text>}
    <View style={styles.row}>{data?.items.filter(item => item.isActive !== false && (!item.status || item.status === 'active')).map(item => <Button key={businessRecordId(item)} label={businessRecordLabel(item)} variant={businessRecordId(item) === value ? 'primary' : 'outline'} disabled={disabled} onPress={() => onChange(businessRecordId(item))} />)}</View>
    {!data && !error ? <ActivityIndicator /> : null}
    {data?.items.length === 0 ? <Text>No matching {resource}.</Text> : null}
    {error ? <><Text accessibilityRole="alert">{error}</Text><RefreshSessionButton /><Button label="Retry options" onPress={() => setRetry(count => count + 1)} /></> : null}
    {data ? <View style={styles.row}><Button label="Previous options" disabled={disabled || page <= 1} onPress={() => setPage(page - 1)} /><Text>Page {page} of {Math.max(1, data.totalPages)}</Text><Button label="Next options" disabled={disabled || page >= data.totalPages} onPress={() => setPage(page + 1)} /></View> : null}
  </View>;
}

function Fields({ fields, values, setValues, companyId, disabled }: { fields: readonly BusinessField[]; values: Record<string, string>; setValues: React.Dispatch<React.SetStateAction<Record<string, string>>>; companyId?: string; disabled?: boolean }): React.JSX.Element {
  return <View style={styles.section}>{fields.map(field => <View key={field.key} style={styles.section}>
    {field.choices ? <><Text>{field.label}{field.required ? ' *' : ''}</Text><View style={styles.row}>{field.choices.map(choice => <Button key={choice} label={choice} disabled={disabled} variant={values[field.key] === choice ? 'primary' : 'outline'} onPress={() => setValues(current => ({ ...current, [field.key]: choice }))} />)}</View></> : field.lookup && companyId ? <><Text>{field.label} *</Text><Lookup companyId={companyId} resource={field.lookup} value={values[field.key] ?? ''} disabled={disabled} onChange={value => setValues(current => ({ ...current, [field.key]: value }))} /></> : <Input label={`${field.label}${field.required ? ' *' : ''}`} value={values[field.key] ?? ''} disabled={disabled} onChangeText={value => setValues(current => ({ ...current, [field.key]: value }))} />}
  </View>)}</View>;
}

function CompanyCreator({ onCreated, onCancel }: { onCreated: (company: BusinessCompany) => void; onCancel: () => void }): React.JSX.Element {
  const [values, setValues] = React.useState(() => businessFormValues(companyFields));
  const [busy, setBusy] = React.useState(false); const [error, setError] = React.useState('');
  const requestSignal = useRequestSignal();
  const save = async () => {
    const { signal, release } = requestSignal();
    setError(''); setBusy(true);
    try { const company = await business.createCompany(businessFormBody(companyFields, values), signal); if (!signal.aborted) onCreated(company); }
    catch (reason) { if (!signal.aborted) setError(businessError(reason)); }
    finally { release(); if (!signal.aborted) setBusy(false); }
  };
  return <Card padded><Text style={styles.title}>Create company</Text><Fields fields={companyFields} values={values} setValues={setValues} disabled={busy} />{error ? <View style={styles.section}><Text accessibilityRole="alert">{error}</Text><RefreshSessionButton /></View> : null}<View style={styles.row}><Button label="Create company" loading={busy} onPress={() => { void save(); }} /><Button label="Cancel" variant="secondary" disabled={busy} onPress={onCancel} /></View></Card>;
}

export function BusinessScreen({ area, onDashboard }: { area: 'crm' | 'inventory' | 'sales' | 'purchasing'; onDashboard?: () => void }): React.JSX.Element {
  const epoch = useAuthStore(state => state.sessionEpoch());
  const tenantId = useAuthStore(state => state.tenantId);
  const userId = useAuthStore(state => state.user?.id);
  return <CompanyWorkspace key={`${businessSessionKey(epoch, tenantId, userId)}:${area}`} area={area} onDashboard={onDashboard} />;
}

function CompanyWorkspace({ area, onDashboard }: { area: 'crm' | 'inventory' | 'sales' | 'purchasing'; onDashboard?: () => void }): React.JSX.Element {
  const { hasPermission } = usePermissions();
  const [companies, setCompanies] = React.useState<readonly BusinessCompany[] | null>(null);
  const [companyId, setCompanyId] = React.useState('');
  const [error, setError] = React.useState(''); const [retry, setRetry] = React.useState(0);
  const [createCompany, setCreateCompany] = React.useState(false);
  const resources: readonly BusinessResource[] = area === 'crm' ? ['customers'] : area === 'sales' ? ['orders'] : area === 'purchasing' ? ['suppliers'] : ['products', 'warehouses', 'stock', 'movements'];
  const [resource, setResource] = React.useState<BusinessResource>(resources[0]);
  const labels: Record<typeof area, { title: string; description: string }> = {
    crm: { title: 'Clientes', description: 'Administra tus relaciones comerciales.' },
    sales: { title: 'Ventas', description: 'Consulta y prepara borradores de pedidos de venta.' },
    purchasing: { title: 'Compras', description: 'Administra el catálogo de proveedores.' },
    inventory: { title: 'Inventario', description: 'Productos, almacenes y movimientos de existencias.' },
  };
  const resourceLabels: Partial<Record<BusinessResource, string>> = {
    customers: 'Clientes', orders: 'Borradores', suppliers: 'Proveedores',
    products: 'Productos', warehouses: 'Almacenes', stock: 'Existencias', movements: 'Movimientos',
  };
  React.useEffect(() => {
    const controller = new AbortController(); setError(''); setCompanies(null);
    void business.companies(controller.signal).then(result => {
      if (!controller.signal.aborted) { setCompanies(result); setCompanyId(current => result.some(company => company.id === current) ? current : result[0]?.id ?? ''); }
    }).catch(reason => { if (!controller.signal.aborted) setError(businessError(reason)); });
    return () => controller.abort();
  }, [retry]);
  return <div className="erp-business-workspace">
    <div className="erp-page-heading">
      <div><p>ESPACIO DE TRABAJO / {labels[area].title.toUpperCase()}</p><h1>{labels[area].title}</h1><span className="erp-subtitle">{labels[area].description}</span></div>
      <div className="erp-workspace-company"><label htmlFor="erp-current-company">Empresa activa</label><select id="erp-current-company" value={companyId} onChange={event => { setCompanyId(event.target.value); setCreateCompany(false); }} disabled={!companies?.length} aria-label="Empresa autorizada">
        {!companies?.length && <option value="">Sin empresa</option>}
        {companies?.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
      </select></div>
    </div>
    {companies === null && !error && <p role="status" className="erp-dashboard-note">Cargando empresas autorizadas…</p>}
    {companies?.length === 0 && <div className="erp-panel"><p className="erp-dashboard-note">No tienes empresas autorizadas. Solicita acceso o crea una empresa si cuentas con el permiso correspondiente.</p></div>}
    {error && <div className="erp-panel" role="alert"><p>{error}</p><RefreshSessionButton /><button type="button" className="erp-button" onClick={() => setRetry(value => value + 1)}>Reintentar</button></div>}
    {hasPermission('tenancy.company.write') && <div className="erp-workspace-utility"><button type="button" className="erp-button" onClick={() => setCreateCompany(true)}>+ Nueva empresa</button></div>}
    {createCompany && <div className="erp-record-overlay"><button type="button" className="erp-record-scrim" aria-label="Cerrar formulario de empresa" onClick={() => setCreateCompany(false)}/><aside className="erp-record-panel" aria-label="Crear empresa"><CompanyCreator onCancel={() => setCreateCompany(false)} onCreated={company => { setCompanies(current => [...(current ?? []), company]); setCompanyId(company.id); setCreateCompany(false); }}/></aside></div>}
    {companyId && companies && <><div className="erp-resource-tabs" role="tablist" aria-label="Secciones del módulo">{resources.map(item => <button key={item} type="button" role="tab" aria-selected={resource === item} className={resource === item ? 'is-active' : ''} onClick={() => setResource(item)}>{resourceLabels[item] ?? businessDefinitions[item].title}</button>)}</div>
      <RecordWorkspace key={companyId + ':' + resource} companyId={companyId} currency={companies.find(company => company.id === companyId)?.defaultCurrency ?? 'MXN'} resource={resource}/></>}
  </div>;
}

function RecordWorkspace({ companyId, resource, currency }: { companyId: string; resource: BusinessResource; currency: string }): React.JSX.Element {
  const definition = businessDefinitions[resource];
  const { hasPermission } = usePermissions();
  const canRead = hasPermission(`${definition.permission}.read`); const canWrite = hasPermission(`${definition.permission}.write`);
  const [search, setSearch] = React.useState(''); const [status, setStatus] = React.useState('');
  const [page, setPage] = React.useState(1); const [data, setData] = React.useState<BusinessPage | null>(null);
  const [error, setError] = React.useState(''); const [revision, setRevision] = React.useState(0);
  const [selected, setSelected] = React.useState<BusinessRecord | null>(null); const [creating, setCreating] = React.useState(false);
  const [productId, setProductId] = React.useState(''); const [warehouseId, setWarehouseId] = React.useState('');
  React.useEffect(() => {
    const controller = new AbortController(); setData(null); setError('');
    if (canRead) void applyBusinessResult(business.list(companyId, resource, { page, limit: 20, ...(definition.search ? { [definition.search]: search.trim() || undefined } : {}), status: status || undefined, productId: productId || undefined, warehouseId: warehouseId || undefined }, controller.signal), controller.signal, setData).catch(reason => { if (!controller.signal.aborted) setError(businessError(reason)); });
    return () => controller.abort();
  }, [companyId, resource, definition.search, canRead, search, status, page, revision, productId, warehouseId]);
  if (!canRead) return <Card padded><Text>Your account cannot read {definition.title.toLowerCase()}.</Text></Card>;
  return <View style={styles.section}><Card padded><Text style={styles.heading}>{definition.title}</Text>
    {definition.search ? <Input label="Search" value={search} onChangeText={value => { setSearch(value); setPage(1); }} /> : null}
    {resource === 'customers' || resource === 'orders' || resource === 'suppliers' ? <View style={styles.row}>{(resource === 'customers' ? ['', 'active', 'inactive', 'blocked'] : resource === 'suppliers' ? ['', 'active', 'inactive'] : ['', 'DRAFT', 'CANCELLED']).map(value => <Button key={value} label={value || 'All statuses'} variant={status === value ? 'primary' : 'outline'} onPress={() => { setStatus(value); setPage(1); }} />)}</View> : null}
    {resource === 'stock' || resource === 'movements' ? <><Text>Filter by product and warehouse</Text><Lookup companyId={companyId} resource="products" value={productId} onChange={value => { setProductId(value); setPage(1); }} /><Lookup companyId={companyId} resource="warehouses" value={warehouseId} onChange={value => { setWarehouseId(value); setPage(1); }} /><Button label="Clear filters" variant="secondary" onPress={() => { setProductId(''); setWarehouseId(''); setPage(1); }} /></> : null}
    <View style={styles.row}><Button label="Refresh" variant="secondary" onPress={() => setRevision(value => value + 1)} />{canWrite && definition.creatable ? <Button label={`New ${resource === 'customers' ? 'customer' : resource === 'products' ? 'product' : resource === 'warehouses' ? 'warehouse' : resource === 'orders' ? 'sales draft' : resource === 'suppliers' ? 'supplier' : 'movement'}`} onPress={() => { setCreating(true); setSelected(null); }} /> : null}</View>
    {!data && !error ? <ActivityIndicator accessibilityLabel="Loading records" /> : null}
    {error ? <View style={styles.section}><Text accessibilityRole="alert">{error}</Text><RefreshSessionButton /></View> : null}
    {data?.items.length === 0 ? <Text>{resource === 'stock' ? 'No stock balances match. Record an inbound movement to receive inventory.' : 'No records match this selection.'}</Text> : null}
    {data?.items.map(item => <View key={businessRecordId(item)} style={styles.record}><Text style={styles.heading}>{resource === 'stock' ? 'Stock balance' : businessRecordLabel(item)}</Text>{resource === 'stock' || resource === 'movements' ? <><ReferenceName companyId={companyId} resource="products" id={text(item.productId)} label="Product" /><ReferenceName companyId={companyId} resource="warehouses" id={text(item.warehouseId)} label="Warehouse" /></> : null}<Text>{resource === 'stock' ? `On hand ${text(item.onHand)} · Available ${text(item.available)}` : resource === 'movements' ? `${text(item.quantity)} · ${text(item.reason)} · ${text(item.createdAt)}` : `${text(item.email ?? item.sku ?? item.code)} · ${text(item.status ?? (item.isActive ? 'active' : 'inactive'))}`}</Text><Button label="View details" variant="outline" onPress={() => { setSelected(item); setCreating(false); }} /></View>)}
    {data ? <View style={styles.row}><Button label="Previous" disabled={page <= 1} onPress={() => setPage(page - 1)} /><Text>{data.total} records · Page {page} of {Math.max(1, data.totalPages)}</Text><Button label="Next" disabled={page >= data.totalPages} onPress={() => setPage(page + 1)} /></View> : null}
  </Card>
  {creating && canWrite && resource === 'orders' ? <SalesDraftEditor companyId={companyId} currency={currency} onCancel={() => setCreating(false)} onSaved={record => { setCreating(false); setSelected(record); setRevision(value => value + 1); }} /> : null}
  {creating && canWrite && resource !== 'orders' ? <RecordEditor key="new" companyId={companyId} resource={resource} onCancel={() => setCreating(false)} onSaved={record => { setCreating(false); setSelected(record); setRevision(value => value + 1); }} /> : null}
  {selected ? <RecordDetail key={businessRecordId(selected)} companyId={companyId} resource={resource} initial={selected} canWrite={canWrite} onClose={() => setSelected(null)} onChanged={() => setRevision(value => value + 1)} /> : null}
  </View>;
}

function RecordEditor({ companyId, resource, record, onSaved, onCancel }: { companyId: string; resource: BusinessResource; record?: BusinessRecord; onSaved: (record: BusinessRecord) => void; onCancel: () => void }): React.JSX.Element {
  const definition = businessDefinitions[resource]; const requestSignal = useRequestSignal();
  const [values, setValues] = React.useState(() => businessFormValues(definition.fields, record));
  const [error, setError] = React.useState(''); const [busy, setBusy] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const [movementBody, setMovementBody] = React.useState<Readonly<Record<string, unknown>> | null>(null);
  const [idempotencyKey] = React.useState(() => business.movementKey());
  const save = async () => {
    const { signal, release } = requestSignal();
    setBusy(true); setError('');
    try {
      const body = movementBody ?? businessFormBody(definition.fields, values);
      if (resource === 'movements') setMovementBody({ ...body, idempotencyKey });
      const result = record ? await business.update(companyId, resource, businessRecordId(record), { ...body, expectedVersion: record.version }, signal) : await business.create(companyId, resource, resource === 'movements' ? { ...body, idempotencyKey } : body, signal);
      if (!signal.aborted) onSaved(result);
    } catch (reason) { if (!signal.aborted) setError(businessError(reason)); }
    finally { release(); if (!signal.aborted) setBusy(false); }
  };
  return <Card padded><Text style={styles.heading}>{record ? 'Edit' : 'Create'} {definition.title.toLowerCase()}</Text><Fields fields={definition.fields} values={values} setValues={setValues} companyId={companyId} disabled={busy || movementBody !== null} />
    {record ? <Text>Blank optional fields keep their existing value.</Text> : null}
    {error ? <View style={styles.section}><Text accessibilityRole="alert">{error}</Text><RefreshSessionButton /></View> : null}
    {movementBody && error ? <Text>Retry sends the same movement and request key. Check movement history before starting a different movement after a network error.</Text> : null}
    {confirm ? <View style={styles.section}><Text>Confirm saving these changes{resource === 'movements' ? ' to inventory balances' : ''}?</Text><Button label="Confirm save" loading={busy} onPress={() => { void save(); }} /></View> : <Button label="Review and save" onPress={() => { try { businessFormBody(definition.fields, values); setError(''); setConfirm(true); } catch (reason) { setError(businessError(reason)); } }} />}
    <Button label="Cancel" variant="secondary" disabled={busy} onPress={onCancel} />
  </Card>;
}

function RecordDetail({ companyId, resource, initial, canWrite, onClose, onChanged }: { companyId: string; resource: BusinessResource; initial: BusinessRecord; canWrite: boolean; onClose: () => void; onChanged: () => void }): React.JSX.Element {
  const definition = businessDefinitions[resource]; const requestSignal = useRequestSignal();
  const [record, setRecord] = React.useState<BusinessRecord | null>(definition.editable ? null : initial);
  const [error, setError] = React.useState(''); const [revision, setRevision] = React.useState(0);
  const [editing, setEditing] = React.useState(false); const [confirm, setConfirm] = React.useState(false); const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    const controller = new AbortController();
    if (definition.editable) { setEditing(false); setRecord(null); setError(''); void business.detail(companyId, resource, businessRecordId(initial), controller.signal).then(result => { if (!controller.signal.aborted) setRecord(result); }).catch(reason => { if (!controller.signal.aborted) setError(businessError(reason)); }); }
    return () => controller.abort();
  }, [companyId, resource, initial, definition.editable, revision]);
  const toggle = async () => {
    if (!record) return;
    const { signal, release } = requestSignal();
    setBusy(true); setError('');
    try { const updated = resource === 'orders' ? await business.cancelOrder(companyId, businessRecordId(record), record.version!, signal) : await business.update(companyId, resource, businessRecordId(record), { expectedVersion: record.version, ...(resource === 'customers' || resource === 'suppliers' ? { status: record.status === 'active' ? 'inactive' : 'active' } : { isActive: !record.isActive }) }, signal); if (!signal.aborted) { setRecord(updated); setConfirm(false); onChanged(); } }
    catch (reason) { if (!signal.aborted) setError(businessError(reason)); }
    finally { release(); if (!signal.aborted) setBusy(false); }
  };
  if (editing && record && canWrite) return <RecordEditor key={String(record.version)} companyId={companyId} resource={resource} record={record} onCancel={() => setEditing(false)} onSaved={updated => { setRecord(updated); setEditing(false); onChanged(); }} />;
  return <Card padded><Text style={styles.heading}>Details</Text>{!record && !error ? <ActivityIndicator /> : null}{error ? <View style={styles.section}><Text accessibilityRole="alert">{error}</Text><RefreshSessionButton /></View> : null}{record ? <RecordSummary companyId={companyId} resource={resource} record={record} /> : null}
    <View style={styles.row}>{definition.editable ? <Button label="Reload details" variant="secondary" disabled={busy} onPress={() => { setConfirm(false); setRevision(value => value + 1); }} /> : null}{canWrite && definition.editable && resource !== 'orders' && record ? <><Button label="Edit" disabled={busy} onPress={() => setEditing(true)} /><Button label={record.status === 'active' || record.isActive === true ? 'Deactivate' : 'Activate'} variant="secondary" disabled={busy} onPress={() => setConfirm(true)} /></> : null}{canWrite && resource === 'orders' && record?.status === 'DRAFT' ? <Button label="Cancel draft" variant="danger" disabled={busy} onPress={() => setConfirm(true)} /> : null}<Button label="Close details" variant="secondary" disabled={busy} onPress={onClose} /></View>
    {confirm ? <View style={styles.section}><Text>{resource === 'orders' ? 'Confirm cancelling this draft? It cannot be reopened.' : 'Confirm changing this record’s active status?'}</Text><Button label={resource === 'orders' ? 'Confirm cancellation' : 'Confirm status change'} loading={busy} onPress={() => { void toggle(); }} /><Button label="Keep current state" disabled={busy} variant="secondary" onPress={() => setConfirm(false)} /></View> : null}
  </Card>;
}
function ReferenceName({ companyId, resource, id, label }: { companyId: string; resource: 'products' | 'warehouses' | 'customers'; id: string; label: string }): React.JSX.Element {
  const [name, setName] = React.useState('Loading…');
  React.useEffect(() => {
    const controller = new AbortController();
    void business.detail(companyId, resource, id, controller.signal).then(record => { if (!controller.signal.aborted) setName(businessRecordLabel(record)); }).catch(() => { if (!controller.signal.aborted) setName('Unavailable'); });
    return () => controller.abort();
  }, [companyId, resource, id]);
  return <Text>{label}: {name}</Text>;
}
function RecordSummary({ companyId, resource, record }: { companyId: string; resource: BusinessResource; record: BusinessRecord }): React.JSX.Element {
  const definition = businessDefinitions[resource];
  return <View style={styles.section}>
    {definition.fields.filter(field => !field.lookup).map(field => <Text key={field.key}>{field.label}: {text(record[field.key])}</Text>)}
    {resource === 'orders' ? <><Text>Draft: {text(record.number)}</Text><ReferenceName companyId={companyId} resource="customers" id={text(record.customerId)} label="Customer" /><ReferenceName companyId={companyId} resource="warehouses" id={text(record.warehouseId)} label="Warehouse" /><Text>Status: {text(record.status)}</Text><Text>Subtotal: {text(record.subtotal)} {text(record.currency)}</Text><Text>Tax and final total are not calculated. A tax policy is required before confirmation. Drafts do not reserve or reduce stock.</Text>{Array.isArray(record.lines) ? record.lines.map((line: Record<string, unknown>, index: number) => <View key={index}><Text>{text(line.description)} · {text(line.quantity)} × {text(line.unitPrice)} = {text(line.subtotal)} {text(record.currency)}</Text></View>) : null}{Array.isArray(record.availability) ? <><Text style={styles.heading}>Current availability (informational)</Text>{record.availability.map((balance: Record<string, unknown>, index: number) => <View key={index}><ReferenceName companyId={companyId} resource="products" id={text(balance.itemId)} label="Product" />{balance.availability && typeof balance.availability === 'object' ? <Text>Available: {text((balance.availability as Record<string, unknown>).available)} · On hand: {text((balance.availability as Record<string, unknown>).onHand)}</Text> : <Text>Availability unavailable because the product or warehouse is inactive or missing.</Text>}</View>)}</> : null}</> : null}
    {resource === 'stock' || resource === 'movements' ? <><ReferenceName companyId={companyId} resource="products" id={text(record.productId)} label="Product" /><ReferenceName companyId={companyId} resource="warehouses" id={text(record.warehouseId)} label="Warehouse" />{resource === 'stock' ? <><Text>On hand: {text(record.onHand)} · Available: {text(record.available)}</Text><Text>Reservations are not supported.</Text></> : null}</> : null}
    {resource === 'customers' || resource === 'suppliers' ? <Text>Status: {text(record.status)}</Text> : resource === 'products' || resource === 'warehouses' ? <Text>Status: {record.isActive ? 'Active' : 'Inactive'}</Text> : null}
    {record.createdAt ? <Text>Created: {text(record.createdAt)}</Text> : null}{record.updatedAt ? <Text>Updated: {text(record.updatedAt)}</Text> : null}
  </View>;
}
function SalesDraftEditor({ companyId, currency, onSaved, onCancel }: { companyId: string; currency: string; onSaved: (record: BusinessRecord) => void; onCancel: () => void }): React.JSX.Element {
  const requestSignal = useRequestSignal();
  const [values, setValues] = React.useState(() => businessFormValues(businessDefinitions.orders.fields));
  const [lines, setLines] = React.useState<readonly SalesDraftLineInput[]>([{ itemId: '', quantity: '1', unitPrice: '0' }]);
  const [busy, setBusy] = React.useState(false); const [error, setError] = React.useState('');
  const [prepared, setPrepared] = React.useState<Readonly<Record<string, unknown>> | null>(null);
  const [idempotencyKey] = React.useState(() => business.movementKey());
  const save = async () => {
    if (!prepared) return;
    const { signal, release } = requestSignal(); setBusy(true); setError('');
    try { const result = await business.create(companyId, 'orders', prepared, signal); if (!signal.aborted) onSaved(result); }
    catch (reason) { if (!signal.aborted) setError(businessError(reason)); }
    finally { release(); if (!signal.aborted) setBusy(false); }
  };
  const changeLine = (index: number, patch: Partial<SalesDraftLineInput>) => setLines(current => current.map((line, position) => position === index ? { ...line, ...patch } : line));
  return <Card padded><Text style={styles.heading}>Create sales draft</Text><Text>Currency: {currency}. Tax and final total remain pending a tax policy. Saving a draft does not reserve inventory.</Text>
    <Fields fields={businessDefinitions.orders.fields.filter(field => field.key !== 'currency')} values={values} setValues={setValues} companyId={companyId} disabled={busy || prepared !== null} />
    {lines.map((line, index) => <View key={index} style={styles.record}><Text style={styles.heading}>Line {index + 1}</Text><Lookup companyId={companyId} resource="products" value={line.itemId} onChange={itemId => changeLine(index, { itemId })} disabled={busy || prepared !== null} /><Input label="Quantity" value={line.quantity} onChangeText={quantity => changeLine(index, { quantity })} disabled={busy || prepared !== null} /><Input label={`Unit price (${currency})`} value={line.unitPrice} onChangeText={unitPrice => changeLine(index, { unitPrice })} disabled={busy || prepared !== null} /><Button label="Remove line" variant="secondary" disabled={busy || prepared !== null || lines.length <= 1} onPress={() => setLines(current => current.filter((_, position) => position !== index))} /></View>)}
    <Button label="Add line" variant="secondary" disabled={busy || prepared !== null || lines.length >= 100} onPress={() => setLines(current => [...current, { itemId: '', quantity: '1', unitPrice: '0' }])} />
    {error ? <View style={styles.section}><Text accessibilityRole="alert">{error}</Text><RefreshSessionButton /></View> : null}
    {prepared ? <><Text>Confirm creating this draft. Retries preserve the same lines and request key.</Text><Button label="Confirm draft" loading={busy} onPress={() => { void save(); }} /></> : <Button label="Review draft" onPress={() => { try { setPrepared({ ...businessFormBody(businessDefinitions.orders.fields, { ...values, currency }), lines: salesDraftLines(lines, currency), idempotencyKey }); setError(''); } catch (reason) { setError(businessError(reason)); } }} />}
    <Button label="Cancel" variant="secondary" disabled={busy} onPress={onCancel} />
  </Card>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.secondary }, container: { padding: 24, gap: 16 },
  title: { fontSize: 26, fontWeight: '600', color: colors.text.primary }, heading: { fontSize: 18, fontWeight: '600', color: colors.text.primary },
  section: { gap: 12 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginVertical: 8 },
  record: { gap: 8, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border.default },
});
