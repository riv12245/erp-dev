import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './enterprise.css';

type IconName = 'grid' | 'users' | 'cart' | 'truck' | 'box' | 'wallet' | 'search' | 'menu' | 'bell' | 'chevron' | 'logout' | 'settings' | 'arrow' | 'close';
const paths: Record<IconName, React.ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v1"/></>,
  cart: <><circle cx="9" cy="20" r="1"/><circle cx="19" cy="20" r="1"/><path d="M2 3h2l3 13h13l2-9H5"/></>,
  truck: <><path d="M2 5h12v13H2zM14 9h4l4 4v5h-8z"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></>,
  box: <><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M3 11h18M9 7v4M8 3h8l2 4H6z"/></>,
  wallet: <><rect x="2" y="6" width="20" height="15" rx="2"/><path d="M2 9V5a2 2 0 0 1 2-2h15M16 14h6v4h-6a2 2 0 0 1 0-4z"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 8-3 8-3 10h18c0-2-3-2-3-10M10 21h4"/></>,
  chevron: <path d="m9 18 6-6-6-6"/>,
  logout: <><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M14 8l4 4-4 4M9 12h9"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/></>,
  arrow: <path d="M5 12h14m-7-7 7 7-7 7"/>,
  close: <path d="M5 5l14 14M19 5 5 19"/>,
};
export function WorkspaceIcon({ name, size = 18 }: { name: IconName; size?: number }): React.JSX.Element {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
type NavigationItem = { label: string; path: string; icon: IconName; description: string };
export const navigation: readonly NavigationItem[] = [
  { label: 'Inicio', path: '/', icon: 'grid', description: 'Tu espacio de trabajo' },
  { label: 'CRM', path: '/crm', icon: 'users', description: 'Clientes' },
  { label: 'Ventas', path: '/sales', icon: 'cart', description: 'Borradores de venta' },
  { label: 'Compras', path: '/purchasing', icon: 'truck', description: 'Proveedores' },
  { label: 'Inventario', path: '/inventory', icon: 'box', description: 'Productos y existencias' },
];
const mobileNavigation = [navigation[0], navigation[2], navigation[4]];
export function EnterpriseShell(): React.JSX.Element {
  const [collapsed, setCollapsed] = React.useState(() => localStorage.getItem('erp-sidebar-collapsed') === 'true');
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [searchOpen, setSearchOpen] = React.useState(false);
  const { user, tenantId, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const current = navigation.find(item => item.path === location.pathname);
  const matches = navigation.filter(item => item.label.toLowerCase().includes(query.trim().toLowerCase()) || item.description.toLowerCase().includes(query.trim().toLowerCase()));
  React.useEffect(() => { setDrawerOpen(false); setSearchOpen(false); setQuery(''); }, [location.pathname]);
  const toggleSidebar = () => setCollapsed(value => {
    localStorage.setItem('erp-sidebar-collapsed', String(!value));
    return !value;
  });
  return <div className={'erp-shell' + (collapsed ? ' erp-shell--collapsed' : '')}>
    {drawerOpen && <button className="erp-mobile-scrim" aria-label="Cerrar menú" onClick={() => setDrawerOpen(false)} />}
    <aside className={'erp-sidebar' + (drawerOpen ? ' erp-sidebar--open' : '')} aria-label="Navegación principal">
      <div className="erp-brand">
        <span className="erp-brand-mark" aria-hidden="true">E</span>
        <div className="erp-brand-copy"><strong>ERP-DEV</strong><small>Enterprise workspace</small></div>
        <button className="erp-icon-button erp-sidebar-close" onClick={() => setDrawerOpen(false)} aria-label="Cerrar menú"><WorkspaceIcon name="close"/></button>
      </div>
      <div className="erp-sidebar-overline">ESPACIO DE TRABAJO</div>
      <nav className="erp-main-nav">
        {navigation.map(item => <NavLink key={item.path} to={item.path} end={item.path === '/'} className={({ isActive }) => 'erp-nav-item' + (isActive ? ' is-active' : '')} title={collapsed ? item.label : undefined} onClick={() => setDrawerOpen(false)}><WorkspaceIcon name={item.icon}/><span>{item.label}</span>{!collapsed && <WorkspaceIcon name="chevron" size={14}/>}</NavLink>)}
      </nav>
      <div className="erp-sidebar-footer"><span className="erp-tenant-icon">E</span><div className="erp-brand-copy"><strong>Espacio de trabajo</strong><small title={tenantId ?? ''}>{tenantId ?? 'Empresa no seleccionada'}</small></div></div>
    </aside>
    <div className="erp-main-column">
      <header className="erp-topbar">
        <div className="erp-topbar-start">
          <button type="button" className="erp-icon-button erp-desktop-toggle" onClick={toggleSidebar} aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'} aria-expanded={!collapsed}><WorkspaceIcon name="menu"/></button>
          <button type="button" className="erp-icon-button erp-mobile-toggle" onClick={() => setDrawerOpen(true)} aria-label="Abrir menú"><WorkspaceIcon name="menu"/></button>
          <span className="erp-topbar-crumb">ERP-DEV <span>/</span> <strong>{current?.label ?? 'Espacio de trabajo'}</strong></span>
        </div>
        <div className="erp-module-search">
          <WorkspaceIcon name="search" size={17}/>
          <input value={query} onFocus={() => setSearchOpen(true)} onChange={event => { setQuery(event.target.value); setSearchOpen(true); }} onKeyDown={event => { if (event.key === 'Escape') setSearchOpen(false); if (event.key === 'Enter' && matches[0]) navigate(matches[0].path); }} aria-label="Buscar módulos" placeholder="Buscar módulo..." autoComplete="off"/>
          <kbd>⌘ K</kbd>
          {searchOpen && query.trim() && <div className="erp-search-results" role="listbox" aria-label="Módulos disponibles">{matches.length ? matches.map(item => <button type="button" role="option" aria-selected={false} key={item.path} onClick={() => navigate(item.path)}><WorkspaceIcon name={item.icon}/><span>{item.label}<small>{item.description}</small></span></button>) : <span className="erp-search-none">No hay módulos con ese nombre</span>}</div>}
        </div>
        <div className="erp-topbar-actions">
          <span className="erp-topbar-tenant" title={tenantId ?? ''}>{tenantId ?? 'Espacio'}</span>
          <span className="erp-avatar" aria-hidden="true">{(user?.name || user?.email || 'E').slice(0, 1).toUpperCase()}</span>
          <span className="erp-account"><strong>{user?.name || user?.email || 'Usuario'}</strong><small>Cuenta activa</small></span>
          <button type="button" className="erp-icon-button" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={() => { void logout(); }}><WorkspaceIcon name="logout"/></button>
        </div>
      </header>
      <main className="erp-page" id="main-content"><Outlet/></main>
      <nav className="erp-mobile-bottom" aria-label="Navegación móvil">
        {mobileNavigation.map(item => <NavLink key={item.path} to={item.path} end={item.path === '/'} className={({ isActive }) => isActive ? 'is-active' : ''}><WorkspaceIcon name={item.icon} size={20}/><span>{item.label}</span></NavLink>)}
        <button type="button" onClick={() => setDrawerOpen(true)}><WorkspaceIcon name="menu" size={20}/><span>Más</span></button>
      </nav>
    </div>
  </div>;
}
