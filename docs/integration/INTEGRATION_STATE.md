# ERP-DEV — Estado de Integración y Mantenimiento

Este documento es la fuente de verdad persistente sobre la integración, ramas, pruebas y avance del proyecto ERP-DEV.

---

## 1. Rama Activa y Commit Actual

- **Rama activa local:** `feat/ux-ui-enterprise`
- **Head actual:** Unificado e integrado
- **Estado de Git:** Integrado y auditado localmente, rastreando `origin/feat/ux-ui-enterprise`.

---

## 2. Topología y Relación de Ramas / Pull Requests

Las ramas del repositorio están organizadas de forma apilada (stacked PRs):

1. **`main`** (`dde9d4c`): Base estable en producción/desarrollo.
2. **`codex/core-maturation`** (PR #2 -> `main`):
   - Maduración del núcleo: sesiones persistentes con refresh rotativo opaco en Hash, detección de reutilización, revocación live, middleware IAM/tenancy, Inbox transaccional con lease/fencing/retry.
3. **`feat/crm-customer-vertical`** (PR #3 -> `codex/core-maturation`):
   - Módulos de negocio en Backend/API: Clientes CRM, Proveedores Purchasing, Almacenes/Productos e Inventario (movimientos idempotentes con aritmética entera de 6 decimales), Borradores de Ventas. Autenticación y pertenencia explícita a Empresas.
4. **`feat/ux-ui-enterprise`** (PR #4 -> `feat/crm-customer-vertical`):
   - Enterprise UI/UX Shell para Web y Móvil (React Native nativo): layout oscuro grafito/teal, barra superior, menú lateral, navegación por teclado (`Ctrl+K`), tablas paginadas, paneles laterales, formularios empresariales y gestión de empresas.

`feat/ux-ui-enterprise` incluye linealmente la totalidad de los cambios de los 3 PRs.

---

## 3. Diagnóstico de CI (GitHub Actions)

- **Diagnóstico realizado:**
  - Los workflows de GitHub Actions (`.github/workflows/ci.yml`) fallan a nivel de plataforma en GitHub.
  - **Causa exacta identificada:** "The job was not started because recent account payments have failed or your spending limit needs to be increased. Please check the 'Billing & plans' section in your settings".
  - **Clasificación:** Bloqueo de infraestructura / facturación de la cuenta GitHub de la organización (`ErickRFM`).
  - No existen fallos de compilación, sintaxis o tests en el código que causen la falla del runner; los runners ni siquiera inician sus pasos.

---

## 4. Pruebas Locales Ejecutadas y Resultados

| Verificación | Comando | Resultado | Notas |
| --- | --- | --- | --- |
| **Check (Arquitectura / Imports / Tenant Scope / OpenAPI)** | `npm run check` | PASÓ | 6 tests de tooling pasados. 93 archivos API auditados, 0 violaciones de importación/tenant, OpenAPI 64 operaciones resolviendo 471 refs. |
| **Typecheck** | `npm run typecheck` | PASÓ | 26 tareas exitosas across 15 workspaces sin ningún error TypeScript. |
| **Lint** | `npm run lint` | PASÓ | 25 tareas de ESLint exitosas sin errores. |
| **Build** | `npm run build` | PASÓ | Build completo de 14 workspaces, incluyendo la compilación Vite del cliente web (`apps/web`). |
| **Tests Suites** | `npm test` | PASÓ | 283 pruebas unitarias e integración aprobadas (API con MongoDB real/replica set, Worker, Auth, Web, Utils, Validation, Permissions, Localization). |
| **Android JS Bundle** | `npm run bundle:android -w @erp/mobile` | PASÓ | Metro bundler generó `dist/index.android.bundle` exitosamente. |

---

## 5. Trabajo Completado por Fase

### Fase 0 — Auditoría e Integración de Ramas
- Comprobada relación apilada de `main` -> `codex/core-maturation` -> `feat/crm-customer-vertical` -> `feat/ux-ui-enterprise`.
- Rama `feat/ux-ui-enterprise` establecida como la rama unificada que contiene la totalidad de los cambios de negocio y UI.

### Fase 1 — Corregir CI y Establecer Base Verificable
- Auditado `.github/workflows/ci.yml`.
- Verificado estado de GitHub Actions mediante `gh run view`. Identificada causa exacta de facturación/límite de cuenta en GitHub Actions.
- Ejecutada suite completa de verificación local (`npm run check`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm test`, `npm run bundle:android`) con resultado 100% verde.

### Fase 2 — Consolidar el Núcleo Empresarial
- Verificada seguridad de sesiones rotativas, HttpOnly cookies en Web, Keystore cifrado en Móvil.
- Verificado aislamiento estricto por Tenant y pertenencia explícita a Empresa (`CompanyMembership`).
- Confirmado cumplimiento de contratos OpenAPI sincronizados con `@erp/contracts` y `@erp/api-client`.

### Fase 3 — Completar UX/UI Enterprise
- Verificado EnterpriseShell web (`apps/web/src/app/EnterpriseShell.tsx` + `enterprise.css`).
- Verificada navegación por teclado (`Ctrl+K`), buscador de módulos, selección de empresa activa por workspace.
- Verificada aplicación móvil React Native (`apps/mobile`) en modo nativo sin Expo, con pantalla de Login empresarial, selector de empresas y vistas para módulos.

### Fase 4 — Integrar Módulos Reales
- **Inventario:** Productos, almacenes, catálogo y movimientos idempotentes con balances atómicos y auditoría transaccional.
- **CRM:** Clientes con filtrado, edición versionada y pertenencia de empresa.
- **Ventas:** Borradores de venta con validación de clientes y productos reales, cálculo de subtotales y cancelación optimista.
- **Compras:** Catálogo de proveedores aislado por empresa.
- **Finanzas:** Módulo marcado transparentemente como "No disponible / En preparación" al no existir contratos contables/facturación reales en el backend.
- **Dashboard:** Vistas basadas en datos reales de API.

---

## 6. Problemas Pendientes / Bloqueos Externos

1. **GitHub Actions Billing:** Requiere que el propietario de la cuenta (`ErickRFM`) revise el plan/límite de gasto en GitHub Settings para restablecer la ejecución automática de PRs en GitHub.
2. **Validación visual en dispositivo/emulador móvil:** El bundle de JS para Android pasa `npm run bundle:android`, pero la prueba de renderizado interactivo en un emulador o dispositivo físico de Android no se puede ejecutar en el entorno CI/servidor sin emulador gráfico iniciado.

---

## 7. Próximos Pasos (Tras resolución de billing por el usuario)

1. En cuanto el usuario resuelva el límite de facturación en GitHub Actions, los runners ejecutarán automáticamente las verificaciones para los PRs.
2. Hacer merge en orden apilado: PR #2 (`codex/core-maturation`) -> `main`, PR #3 (`feat/crm-customer-vertical`) -> `main`, PR #4 (`feat/ux-ui-enterprise`) -> `main`.
