/**
 * Spanish translations.
 */

export const es = {
  common: {
    appName: 'Plataforma ERP',
    loading: 'Cargando...',
    error: 'Ocurrió un error',
    retry: 'Reintentar',
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    search: 'Buscar',
    confirm: 'Confirmar',
    back: 'Atrás',
  },
  auth: {
    login: 'Iniciar sesión',
    register: 'Crear cuenta',
    logout: 'Cerrar sesión',
    email: 'Correo',
    password: 'Contraseña',
    forgotPassword: '¿Olvidaste tu contraseña?',
    loginError: 'Credenciales inválidas',
  },
  tenant: {
    tenant: 'Organización',
    company: 'Empresa',
    branch: 'Sucursal',
  },
  nav: {
    dashboard: 'Tablero',
    crm: 'CRM',
    sales: 'Ventas',
    inventory: 'Inventario',
    procurement: 'Compras',
    finance: 'Finanzas',
    hr: 'Recursos Humanos',
    projects: 'Proyectos',
  },
} as const;