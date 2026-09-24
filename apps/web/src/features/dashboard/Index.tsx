import React from 'react';
import { Link } from 'react-router-dom';
import { businessError, createBusinessClient } from '@erp/api-client';
import type { BusinessCompany } from '@erp/api-client';
import { apiClient } from '../../services/api-client';
import { useAuth } from '../../hooks/useAuth';
import { navigation, WorkspaceIcon } from '../../app/EnterpriseShell';

const business = createBusinessClient(apiClient);

export function DashboardScreen(): React.JSX.Element {
  const { user } = useAuth();
  const [companies, setCompanies] = React.useState<readonly BusinessCompany[] | null>(null);
  const [error, setError] = React.useState('');
  const [revision, setRevision] = React.useState(0);
  React.useEffect(() => {
    const controller = new AbortController();
    setCompanies(null);
    setError('');
    void business.companies(controller.signal)
      .then(result => { if (!controller.signal.aborted) setCompanies(result); })
      .catch(reason => { if (!controller.signal.aborted) setError(businessError(reason)); });
    return () => controller.abort();
  }, [revision]);
  const displayName = user?.name?.split('@')[0] ?? 'equipo';
  return <div className="erp-dashboard">
    <div className="erp-page-heading">
      <div><p>ESPACIO DE TRABAJO / INICIO</p><h1>Buen día, {displayName}</h1><span className="erp-subtitle">Consulta tus empresas y accede a las operaciones disponibles.</span></div>
      <Link className="erp-button" to="/inventory"><WorkspaceIcon name="box" size={16}/> Abrir inventario</Link>
    </div>
    <div className="erp-dashboard-overview">
      <section className="erp-feature-panel">
        <div><span className="eyebrow">ERP-DEV · OPERACIONES</span><h2>Todo tu negocio, en un solo lugar.</h2><p>Gestiona clientes, productos, proveedores y borradores de ventas desde un espacio de trabajo conectado.</p></div>
        <Link to="/sales" className="erp-button erp-button--primary">Ver ventas <WorkspaceIcon name="arrow" size={15}/></Link>
      </section>
      <section className="erp-panel" aria-label="Empresas autorizadas">
        <div className="erp-panel-title"><h2>Empresas autorizadas</h2><small>Acceso desde el servidor</small></div>
        {companies === null && !error && <p role="status" className="erp-dashboard-note">Cargando empresas…</p>}
        {error && <div role="alert"><p className="erp-dashboard-note">{error}</p><button type="button" className="erp-button" onClick={() => setRevision(value => value + 1)}>Reintentar</button></div>}
        {companies?.length === 0 && <p className="erp-dashboard-note">No tienes empresas autorizadas. Solicita acceso o crea una empresa desde un módulo cuando tu cuenta lo permita.</p>}
        {companies && companies.length > 0 && <ul className="erp-company-list">{companies.map(company => <li key={company.id}><span>{company.name}</span><small>{company.defaultCurrency}</small></li>)}</ul>}
        <p className="erp-dashboard-note">Selecciona la empresa en cada módulo para consultar sus registros.</p>
      </section>
    </div>
    <section aria-labelledby="erp-module-heading">
      <div className="erp-panel-title"><h2 id="erp-module-heading">Módulos de trabajo</h2><small>Funciones disponibles en esta etapa</small></div>
      <div className="erp-module-grid">{navigation.filter(item => item.path !== '/').map(item => <Link className="erp-module-tile" key={item.path} to={item.path}><span className="erp-module-icon"><WorkspaceIcon name={item.icon} size={20}/></span><div><strong>{item.label}</strong><br/><small>{item.description}</small></div><WorkspaceIcon name="arrow" size={16}/></Link>)}</div>
    </section>
    <p className="erp-dashboard-note">Las operaciones y el acceso a registros dependen de tus permisos. Los pedidos de venta disponibles en esta etapa son borradores: todavía no confirman pagos, facturas ni reservas de inventario.</p>
  </div>;
}
