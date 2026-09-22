# Frontend Architecture

**Document**: FRONTEND_ARCHITECTURE.md  
**Version**: 1.0.0  
**Last Updated**: September 21, 2026  
**Status**: Active

## Overview

The ERP Platform frontend consists of two applications: a web application built with React and a mobile application built with React Native. Both applications share a common design system, state management patterns, and API client library through the shared `packages/` directory.

## Application Structure

### Web Application (`apps/web`)
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router
- **State Management**: Context API + Custom hooks (or Redux Toolkit)
- **Styling**: CSS modules + Design Tokens
- **Testing**: Vitest + React Testing Library + Playwright (e2e)
- **Server-Side Rendering**: Optional (Next.js or similar)

### Mobile Application (`apps/mobile`)
- **Framework**: React Native
- **Navigation**: React Navigation
- **State Management**: Same as web (shared logic)
- **Styling**: React Native StyleSheet + Design Tokens
- **Testing**: Vitest + React Native Testing Library + Detox (e2e)
- **Platforms**: iOS and Android

## Shared Architecture

### Package Dependency Graph
```
apps/web    ──┐
              ├── packages/ui ────────► React components
              ├── packages/permissions ──► RBAC hooks
              ├── packages/api-client ─► API client
              ├── packages/auth ───────► Auth hooks
              ├── packages/localization─► i18n hooks
              ├── packages/design-tokens ─► Design system
              ├── packages/validation ──► Form validation
              ├── packages/utils ──────► Utility functions
              ├── packages/contracts ──► TypeScript interfaces
              └── apps/mobile ──────────┘
```

### Shared Code Organization
```
packages/
├── api-client/
│   ├── src/
│   │   ├── client.ts        # HTTP client instance
│   │   ├── interceptors.ts  # Request/response interceptors
│   │   ├── error-handler.ts # Error handling utilities
│   │   └── types.ts         # API request/response types
│   └── package.json
├── auth/
│   ├── src/
│   │   ├── useAuth.ts       # Authentication hook
│   │   ├── AuthContext.ts   # Auth context provider
│   │   └── token-manager.ts # Token storage and refresh
│   └── package.json
├── ui/
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── primitives/      # Base UI primitives
│   │   └── theme.ts         # Theme configuration
│   └── package.json
├── permissions/
│   ├── src/
│   │   ├── usePermissions.ts
│   │   └── PermissionGate.tsx
│   └── package.json
└── ...
```

## State Management

### Global State
- **Auth State**: User info, tokens, authentication status
- **Tenant State**: Current tenant context
- **UI State**: Global UI state (modals, notifications, theme)
- **Cache State**: API response caching

### Local State
- **Page State**: Page-specific state managed via hooks
- **Form State**: Form state management with validation
- **Component State**: Local component state

### State Patterns
```typescript
// Global state via Context
const { state, dispatch } = useGlobalState();

// Local state via hooks
const [formData, setFormData] = useState(initialFormData);
const { data, loading, error } = useQuery(query);

// Async state via custom hooks
const { mutate, isPending } = useMutation(mutationFn);
```

## API Integration

### API Client
- Centralized API client with interceptors
- Automatic token attachment
- Retry logic for failed requests
- Request cancellation
- Response normalization
- Error transformation

### Request Flow
```typescript
// 1. Create request
const request = { method: 'GET', url: '/api/v1/users', params: {} };

// 2. Interceptors modify request
//    - Add Authorization header
//    - Add x-tenant-id header
//    - Add correlation ID

// 3. Send request via API client
const response = await apiClient.request(request);

// 4. Response interceptor handles:
//    - Token refresh on 401
//    - Error normalization
//    - Loading state management
```

## Routing

### Web Routes
```
/                     → Dashboard
/login                → Login page
/register             → Registration page
/tenants              → Tenant management
/tenants/:id          → Tenant details
/companies            → Company management
/users                → User management
/roles                → Role management
/permissions          → Permission management
/settings             → User settings
/admin/*              → Admin sections
```

### Mobile Navigation
```
├── AuthStack
│   ├── LoginScreen
│   └── RegisterScreen
├── MainTabNavigator
│   ├── DashboardTab
│   ├── CompaniesTab
│   ├── UsersTab
│   ├── SettingsTab
└── AuthLoadingScreen
```

## Design System

### Design Tokens (`packages/design-tokens`)
- **Colors**: Primary, secondary, neutral, semantic colors
- **Typography**: Font families, sizes, weights, line heights
- **Spacing**: Consistent spacing scale (4px grid)
- **Breakpoints**: Responsive breakpoints for web and mobile
- **Shadows**: Elevation shadows for cards and modals
- **Border Radius**: Consistent radius values
- **Z-index**: Layering scale

### Component Library (`packages/ui`)
- **Primitive Components**: Box, Text, Button, Input, Card
- **Compound Components**: Form, Table, Modal, Toast
- **Layout Components**: Header, Sidebar, Grid, Flex
- **Navigation Components**: Tabs, Breadcrumbs, Menu
- **Feedback Components**: Alert, Skeleton, Spinner, Progress

### Theming
- Light and dark mode support
- Theme switching via context
- CSS custom properties for web
- StyleSheet.create for React Native
- Theme tokens shared between web and mobile

## Authentication Flow

### Web Authentication
```typescript
// Login flow
const { login } = useAuth();
const result = await login({ email, password });
// Stores tokens, redirects to dashboard

// Token refresh
// Interceptor catches 401 → refreshes token → retries request

// Logout
const { logout } = useAuth();
await logout();
// Clears tokens, redirects to login
```

### Mobile Authentication
- Same authentication logic shared via `packages/auth`
- Secure storage for tokens (React Native Keychain)
- Biometric authentication integration
- Push notification authentication for sensitive operations

## Security

### Client-Side Security
- Tokens stored securely (HTTP-only cookies for web, Keychain for mobile)
- No sensitive data in localStorage
- XSS prevention through output encoding
- CSRF protection via tokens
- Content Security Policy headers
- Certificate pinning for API connections (mobile)

### Data Protection
- Sensitive data not stored in client state
- PII masked in UI when appropriate
- Client-side input validation before API calls
- Secure WebSocket connections for real-time features

## Testing Strategy

### Unit Tests
- Component rendering tests
- Hook behavior tests
- Utility function tests
- State management tests

### Integration Tests
- API client tests with mock server
- Component interaction tests
- State flow tests

### End-to-End Tests
- Playwright for web application
- Detox for mobile application
- Critical user journeys covered
- Cross-platform test scripts shared

## Performance

### Optimization Strategies
- Code splitting and lazy loading
- Memoization of expensive computations
- Virtualized lists for large datasets
- Image optimization and lazy loading
- Service worker for offline capability (web)
- Bundle analysis and tree shaking

### Loading States
- Skeleton screens for data loading
- Spinners for async operations
- Optimistic updates for immediate feedback
- Pagination for large lists

## Deployment

### Web Deployment
- Build to static assets
- Deploy to CDN or static hosting
- Environment configuration via runtime variables
- Health check endpoint
- Automated deployments via CI/CD

### Mobile Deployment
- Build for iOS and Android
- Over-the-air updates for JavaScript (optional)
- App Store submission process
- CodePush or similar for update distribution
- Feature flags for gradual rollout

## Related Documents
- [Architecture Documentation](ARCHITECTURE.md)
- [ADR-004: React Native Web](ADR/ADR-004-react-native-web.md)
- [Native Android Documentation](NATIVE_ANDROID.md)
- [Development Guide](DEVELOPMENT.md)
