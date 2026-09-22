# Web and mobile API session

- Login uses `@erp/api-client`, including timeout, error normalization and correlation ID.
- Web uses `VITE_API_URL` (default development API `http://localhost:3000`).
- Mobile exposes `configureApi(absoluteUrl)` in `apps/mobile/src/services/api-config.ts`; native startup reads `NativeModules.ErpConfig.API_BASE_URL`, compiled from `ERP_API_URL`. Android emulator default is `http://10.0.2.2:3000`. Physical devices need the development machine's reachable LAN URL. Release builds require HTTPS. See `ANDROID_DEVELOPMENT.md`.
- The authenticated store owns the token and tenant. Tenant UI state is a projection and never an authorization source for HTTP headers.
- Login/logout clears tenant and permission projections. Late responses from an earlier login cannot overwrite a new session or reverse logout.
- Tokens remain in memory. Refresh, durable session storage and server-side logout/revocation are not implemented in this phase and must not be represented as working.

Validation: `npm test -w @erp/web` covers web/mobile login contract, denied credentials, logout during login, and request context changes. TypeScript validation covers both clients. These tests do not constitute an Android APK installation test.
