# ERP-DEV — Estado de Integración y Mantenimiento

Este documento es la fuente de verdad persistente sobre la integración, migración, ramas, pruebas y avance del proyecto ERP-DEV.

---

## 1. Migración de Repositorio Principal

- **Nuevo Repositorio Principal (`origin`):** [https://github.com/riv12245/erp-dev](https://github.com/riv12245/erp-dev)
- **Repositorio Histórico de Respaldo (`upstream`):** [https://github.com/ErickRFM/erp-dev](https://github.com/ErickRFM/erp-dev)
- **Rama Activa Principal:** `main`
- **Commit SHA en `main`:** `4fa5e6db62c39bf646d9d95d01d3ac44480dfa61`
- **Estado del Remoto:** Publicado y sincronizado exitosamente con el historial completo de Git.

---

## 2. Topología de Ramas Publicadas en `riv12245/erp-dev`

Las siguientes ramas han sido migradas y publicadas al nuevo repositorio:

1. **`main`** (`4fa5e6d`): Rama principal consolidada que incluye todos los cambios de arquitectura, negocio y UI.
2. **`codex/core-maturation`** (`a25872e`): Núcleo, sesiones persistentes con refresh rotativo opaco Hash, revocación *live*, middleware IAM/tenancy e Inbox transaccional con lease/fencing/retry.
3. **`feat/crm-customer-vertical`** (`62ad68d`): Módulos API (CRM Clientes, Proveedores, Inventario idempotente con 6 decimales, Borradores de Ventas, Membresía de Empresa).
4. **`feat/ux-ui-enterprise`** (`4ad7455`): Enterprise UI/UX Shell para Web y Móvil (React Native nativo).
5. **`integration/erp-enterprise-review`** (`55665cd`): Rama de revisión consolidada.

---

## 3. Estado de GitHub Actions (Nuevo Repositorio `riv12245/erp-dev`)

- **Estado de CI en `riv12245/erp-dev`:** **Iniciado y Funcional**.
- **Run activo:** `35965998849` (`ERP Platform CI`)
- **Pasos ejecutados en verde:**
  - `✓ Repo Checks` (Arquitectura, imports, tenant scope, OpenAPI)
  - `✓ Lint` (ESLint en 15 workspaces)
  - `✓ Typecheck` (TypeScript en 15 workspaces)
  - `✓ Build` (Compilación Turbo y Vite Web)
  - `✓ Tests` (Vitest suites)
  - `✓ Android debug APK` (Compilación nativa con Gradle en Ubuntu runner)

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

### Fase 1 — Verificación del Proyecto Local
- Confirmado commit `4fa5e6db62c39bf646d9d95d01d3ac44480dfa61` en la rama `main` local conteniendo la consolidación total de núcleo, negocio y UI.

### Fase 2 — Configuración del Nuevo Remoto
- Configurado `origin` apuntando a `https://github.com/riv12245/erp-dev.git`.
- Configurado `upstream` conservando la referencia a `https://github.com/ErickRFM/erp-dev.git`.

### Fase 3 — Publicación de Código e Historial Git
- Publicada la rama `main` al nuevo repositorio conservando todos los commits e historial completo.
- Publicadas las ramas históricas `codex/core-maturation`, `feat/crm-customer-vertical`, `feat/ux-ui-enterprise` e `integration/erp-enterprise-review`.

### Fase 4 — Activación de CI en `riv12245/erp-dev`
- Los workflows de GitHub Actions se activaron automáticamente en `riv12245/erp-dev`.

### Fase 5 & 6 — Verificación Completa del ERP y Preparación UX/UI
- Verificada compilación de `EnterpriseShell.tsx`, tokens de diseño `@erp/design-tokens`, componentes `@erp/ui` y React Native móvil `@erp/mobile`.

---

## 6. Siguiente Acción Concreta

Continuar el desarrollo y despliegue del proyecto exclusivamente sobre el nuevo repositorio principal `https://github.com/riv12245/erp-dev.git`.
