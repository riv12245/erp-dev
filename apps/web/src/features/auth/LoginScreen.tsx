import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import '../../app/enterprise.css';

export function LoginScreen(): React.JSX.Element {
  const [tenantId, setTenantId] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const { login, isLoading, error, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  React.useEffect(() => { if (isAuthenticated) navigate('/', { replace: true }); }, [isAuthenticated, navigate]);
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;
    if (await login(email.trim(), password, tenantId.trim())) navigate('/', { replace: true });
  };
  return <main className="erp-auth">
    <section className="erp-auth-brand" aria-label="ERP-DEV">
      <div className="erp-auth-logo"><span className="erp-brand-mark">E</span><strong>ERP-DEV</strong></div>
      <div className="erp-auth-brand-message"><span>ENTERPRISE WORKSPACE</span><h1>Tu empresa.<br/>Todo conectado.</h1><p>Gestiona tus operaciones en un entorno organizado para clientes, productos, compras y ventas.</p></div>
      <div className="erp-auth-foot">ERP-DEV · Gestión empresarial</div>
    </section>
    <section className="erp-auth-form-area">
      <div className="erp-auth-form-card">
        <div className="erp-auth-mobile-brand"><span className="erp-brand-mark">E</span><strong>ERP-DEV</strong></div>
        <span className="erp-auth-eyebrow">ACCESO AL ESPACIO DE TRABAJO</span>
        <h2>Bienvenido de nuevo</h2>
        <p className="erp-auth-intro">Ingresa con tu empresa y tus credenciales para continuar.</p>
        <form onSubmit={event => { void handleSubmit(event); }} aria-label="Iniciar sesión" className="erp-auth-form">
          <label htmlFor="erp-tenant">Identificador de empresa</label>
          <input id="erp-tenant" name="tenant" autoComplete="organization" required value={tenantId} onChange={event => setTenantId(event.target.value)} placeholder="Identificador de tu espacio" disabled={isLoading}/>
          <label htmlFor="erp-email">Correo electrónico</label>
          <input id="erp-email" name="email" type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} placeholder="nombre@empresa.com" disabled={isLoading}/>
          <label htmlFor="erp-password">Contraseña</label>
          <input id="erp-password" name="password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} placeholder="Ingresa tu contraseña" disabled={isLoading}/>
          {error && <p className="erp-auth-error" role="alert">{error}</p>}
          <button className="erp-button erp-button--primary erp-auth-submit" type="submit" disabled={isLoading}>{isLoading ? 'Iniciando sesión…' : 'Iniciar sesión →'}</button>
        </form>
        <p className="erp-auth-help">Si no tienes acceso, solicita una cuenta al administrador de tu empresa.</p>
      </div>
    </section>
  </main>;
}
