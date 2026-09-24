import React from 'react';
import { Link } from 'react-router-dom';
import { WorkspaceIcon } from '../../app/EnterpriseShell';

export function FinanceScreen(): React.JSX.Element {
  return <section className="erp-dashboard" aria-labelledby="erp-finance-title">
    <div className="erp-page-heading"><div><p>ESPACIO DE TRABAJO / FINANZAS</p><h1 id="erp-finance-title">Finanzas</h1><span className="erp-subtitle">Cuentas y operaciones financieras</span></div></div>
    <div className="erp-panel erp-not-ready"><span className="erp-module-icon"><WorkspaceIcon name="wallet" size={25}/></span><h2>Módulo en preparación</h2>
      <p>Los contratos de contabilidad, facturación, cuentas por cobrar y pagos todavía no forman parte de los flujos operativos disponibles. Esta pantalla no muestra cifras ni operaciones simuladas.</p>
      <Link to="/" className="erp-button">← Volver al inicio</Link>
    </div>
  </section>;
}
