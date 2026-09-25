# ERP-DEV — Registro de Auditoría de Arquitectura y Estructura

**Fecha:** 2026-09-24  
**Rama:** `audit/erp-integral-hardening`  
**Repositorio Principal:** `https://github.com/riv12245/erp-dev.git`

---

## 1. Visión General de la Arquitectura

ERP-DEV es un monorepositorio modular empresarial estructurado con TurboRepo y npm workspaces:

- **Apps (`apps/`):**
  - `web`: Frontend empresarial construido con React 18, TypeScript, Vite y React Router.
  - `mobile`: Aplicación móvil React Native nativa para Android/iOS (sin Expo).
- **Services (`services/`):**
  - `api`: Backend principal en Node.js, Express, TypeScript, Mongoose/MongoDB.
  - `worker`: Servicio en segundo plano para consumo de Outbox/Inbox transaccional e integración asíncrona de eventos de dominio.
- **Packages (`packages/`):**
  - `api-client`: Cliente HTTP unificado con soporte para refresh rotativo, contexto tenant/empresa, abort controller e idempotencia.
  - `auth`: Utilidades de hash de contraseñas, JWT, fuerza bruta y tokens opacos.
  - `contracts`: Contratos compartidos de TypeScript y esquemas Zod para la API.
  - `design-tokens`: Paleta semántica compartida (grafito/teal).
  - `localization`, `outbox`, `permissions`, `shared`, `ui`, `utils`, `validation`.

---

## 2. Hallazgos y Evaluación de Componentes

### A. Cliente Móvil Nativo Android (`apps/mobile`)
- **Mapeo de URL API:** `api-config.ts` exporta `authClient` y `apiClient`. `authClient` requiere evaluación dinámica de `getApiBaseUrl()` para garantizar que la reconfiguración ejecutada en `index.js` mediante `NativeModules.ErpConfig.API_BASE_URL` se refleje inmediatamente en peticiones de login/restore.
- **Almacenamiento Seguro:** `ErpSecureSessionModule.kt` utiliza Android Keystore para cifrar y almacenar el refresh token.

### B. Módulos Empresariales (`services/api/src/modules`)
- **CRM:** Clientes con soporte para filtrado, versionado y pertenencia de empresa.
- **Inventario:** Productos, almacenes, catálogo de stock y movimientos idempotentes con balances atómicos y aritmética de 6 decimales.
- **Ventas:** Borradores (`DRAFT`) y cancelación optimista.
- **Compras:** Proveedores con ámbito de empresa.
- **Finanzas, Producción, Logística:** Estructura inicial y contratos preliminares; requieren evolución hacia operaciones de cuentas por cobrar/pagar, listas de materiales y despacho.

---

## 3. Estado de Calidad y Pruebas
- **Suites Automatizadas:** 283/283 pruebas unitarias e integración aprobadas.
- **Validaciones de Arquitectura (`npm run check`):** 0 violaciones de importación, OpenAPI sincronizado con 64 operaciones.
