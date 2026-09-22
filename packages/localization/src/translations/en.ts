/**
 * English translations (default locale).
 */

export const en = {
  common: {
    appName: 'ERP Platform',
    loading: 'Loading...',
    error: 'Something went wrong',
    retry: 'Retry',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    search: 'Search',
    confirm: 'Confirm',
    back: 'Back',
  },
  auth: {
    login: 'Sign in',
    register: 'Create account',
    logout: 'Sign out',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot password?',
    loginError: 'Invalid credentials',
  },
  tenant: {
    tenant: 'Organization',
    company: 'Company',
    branch: 'Branch',
  },
  nav: {
    dashboard: 'Dashboard',
    crm: 'CRM',
    sales: 'Sales',
    inventory: 'Inventory',
    procurement: 'Procurement',
    finance: 'Finance',
    hr: 'Human Resources',
    projects: 'Projects',
  },
} as const;