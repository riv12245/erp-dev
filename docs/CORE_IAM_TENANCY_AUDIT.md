# Auditoría real Core / IAM / Tenancy

Fecha: 2026-09-22. Repositorio: ERP modular monolith. Runtime comprobado: Node 24.18.0, Mongoose 8.24.4, MongoDB driver 6.21.0. Rama: `fix/core-iam-tenancy-audit`.

## Resultado y alcance

El flujo Auth + IAM + Tenancy implementado queda corregido y probado mediante HTTP con MongoDB temporal y con Atlas `erp_dev`. Se conserva Express/TypeScript strict, modelos Mongoose existentes, monorepo, `sub → userId`, protección de `/auth/me`, conexión con `connection.asPromise()` y workaround DNS local. No se implementaron módulos empresariales ni microservicios.

Evidencia estructurada: [CORE_IAM_GATES.json](CORE_IAM_GATES.json). Contrato actualizado: [OpenAPI README](../openapi/README.md). Comandos manuales: [verify-core.ps1](../scripts/verify-core.ps1).

Esto NO certifica que el ERP completo esté terminado: gestión IAM, onboarding, refresh/logout, flujos empresariales y partes del worker siguen pendientes.

## Estado inicial / seguridad Git

Se ejecutaron `git status`, `git branch --show-current`, `git log --oneline --decorate -15`, `git diff`, `git diff --cached` antes de editar.

- Rama inicial `main`, sin ningún commit. `git log` falla porque HEAD no existe; ambos diffs están vacíos porque todos los archivos son untracked.
- Todos los archivos preexistentes se trataron como trabajo del usuario. No se hizo reset, descarte, checkout destructivo, push ni merge. `.env` no se modificó.
- Se creó la rama solicitada. La primera escritura Git fue bloqueada por permisos del sandbox; el intento autorizado posterior tuvo éxito.
- Se guardó una copia pre-edición de API src/tests, paquetes Auth/Permissions src, scripts, OpenAPI y manifests en `%TEMP%/erp-audit-original`. Se comparó el resultado contra esa copia, además de revisar código final y `git diff --check`.
- **Commits creados: ninguno.** Sin un commit base, un supuesto commit de corrección introduciría archivos completos del usuario y no expresaría un cambio atómico revisable. Se conserva el estado untracked; no se creó un commit inicial masivo ni se añadieron secretos al índice.

## Hallazgos críticos

| Hallazgo inicial | Evidencia / corrección |
|---|---|
| Login seleccionaba el primer tenant activo e ignoraba userId | `auth-app-service.ts`; reproducción HTTP GLOBAL→ACME 200 antes, 403 después. Selección explícita mediante header y membership activa |
| Todos recibían ADMIN | JWT llevaba `roles: ['ADMIN']`; ahora roles provienen de membership→roles del tenant |
| JWT y header podían referirse a tenants distintos | Middleware compartido rechaza ambos sentidos con 403, incluido `/me` y países globales |
| Repositorio base permitía reemplazar tenantId | Spread de filtros/datos sobrescribía el contexto. Ahora filtros se unen con `$and`, create/update fuerzan tenant del contexto |

## Hallazgos altos

- `/tenants/:id` exponía perfiles de otros tenants: ahora path ID debe coincidir con contexto autenticado.
- IAM no se aplicaba a rutas; audit y escritura de países eran accesibles sin permission específica. Se reutiliza `RbacEngine` mediante middleware `requirePermission`.
- La búsqueda de roles system admitía roles con tenant ajeno: solo un rol sin tenant puede ser system global; el rol local prevalece ante homónimos.
- Seed no creaba IAM, duplicaba schemas, imprimía URI y contraseña y podía vaciar colecciones completas. Ahora reutiliza modelos, crea grants, tiene guard DEV/test y reset acotado.
- Brute force usaba `rateLimitMax`, perdía incrementos concurrentes y no normalizaba status tras expirar bloqueo. Umbral propio, update pipeline atómico, recuperación y comprobación de estado antes de emitir JWT.
- Producción aceptaba el secreto JWT de desarrollo: ahora exige secreto explícito de al menos 32 caracteres y rechaza el valor de desarrollo.

## Hallazgos medios

- AuthUser carecía de permissions reales y email: se hidratan desde usuario y roles actuales en servidor. Una revocación no espera la expiración del JWT.
- Verificador JWT no validaba algoritmo/tipos; comparaba strings de firma. Ahora HS256/typ JWT, claims tipados, fechas finitas, firma mediante Web Crypto verify.
- Wildcards RBAC interpretaban metacaracteres regex: ahora todo salvo `*` se escapa como literal.
- Registro aceptaba email inválido y password débil pese a existir validadores: se reutiliza `@erp/validation`.
- `/audit?limit=0` permitía consulta ilimitada; negativos/NaN podían causar errores internos. Ahora limit entero 1..100 y offset entero >=0.
- El override MongoDB declarado no estaba aplicado: Mongoose usaba driver anidado 6.20.0. Se corrigieron resolución y lockfile; `npm ls mongoose mongodb` muestra 6.21.0 y no se cambió Mongoose de major. Versiones ajenas a la auditoría se conservaron.
- Clientes web/móvil omitían tenant y podían navegar tras error: selector explícito, header, identidad real, limpieza de token obsoleto y navegación solo cuando login devuelve true.
- OpenAPI prometía refresh tokens, registro con tenant, respuestas `success`, `/me` anónimo y tenant por defecto. Se corrigió el contrato vivo y se marcaron operaciones futuras.

## Hallazgos bajos / herramientas

- DNS Cloudflare se aplicaba siempre: ahora solo development, desactivable con `LOCAL_CLOUDFLARE_DNS=false`; producción conserva DNS de su plataforma.
- `check:tenant-scope` no reconocía separadores Windows en rutas de modelos/repositorios: normalizados.
- ESLint no tenía configuración: se añadió configuración de comprobaciones de corrección, reutilizando herramientas ya instaladas. TypeScript strict sigue siendo el gate de tipos.
- `test:integration` y `test:e2e` devolvían 0 sin ejecutar pruebas, solo dependencias build. Ahora existen tareas API reales de integración y HTTP E2E.
- Errores del driver podían registrar detalles de conexión: bootstrap/database/error handler evitan imprimir errores crudos con posibles secretos.

## Arquitectura final

```text
Login(email, password, x-tenant-id)
  → credenciales / estado / bloqueo
  → Tenant selection explícita y tenant activo
  → Membership(userId, tenantId, active)
  → Roles tenant-local o system sin tenant
  → Permissions de Role.permissions
  → JWT { sub, tenantId, roles, iat, exp }
Petición protegida
  → TenantContext
  → firma/claims/expiración JWT
  → JWT tenant === header tenant
  → usuario activo + tenant activo + membership activa
  → roles/permissions actuales desde IAM
  → Authorization/RbacEngine
  → Resource
```

Decisión: permisos resueltos en servidor. La implementación existente ya guardaba `roleNames` en membership y `permissions` en roles; reutilizarlos evita otra autoridad paralela y permite revocación inmediata en la siguiente petición. El catálogo Permission describe nombres; los grants efectivos están en Role.permissions. El JWT conserva roles como información, pero no los usa como autoridad para autorizar.

Cada app captura su verificador/resolver, eliminando el decoder global mutable. AuthUser recibe email, roles y permissions definidos. No se inventó un segundo modelo de identidad.

Register crea identidad global sin membership. No otorga tenant ni rol por campos enviados por el cliente. Onboarding y CRUD IAM están pendientes; el seed es la provisión demo explícita.

El orden protegido es contexto→auth→IAM→permission. `/me`, `/tenants/context` y perfiles requieren membership; países requieren además `master-data.country.read/write` y audit `audit.read`. No existe bypass por nombre ADMIN. Countries permanece global/shared: su escritura autorizada afecta a todos los tenants y está documentada así.

Company/branch recibidos por headers siguen siendo metadatos del contexto, no membresías ni autorizaciones independientes; ningún flujo de negocio implementado los usa como autoridad.

## Seed, Atlas y arranque

- Seed ejecutado dos veces **sin reset** contra Atlas `erp_dev`, tras autorización explícita del usuario. Ambos exit 0.
- Conteo real posterior: 3 tenants demo, 4 usuarios demo, 6 roles demo y 4 memberships. El test temporal comprueba además idempotencia y preservación de datos ajenos al reset.
- Admin ACME/GLOBAL/LABS → ADMIN dentro de su tenant; SALES ACME → SALES con lectura de países.
- Usa los mismos factories Mongoose y el mismo hashing PBKDF2-SHA256 del API. No guarda tenantId en User; la asociación está en Membership.
- Índices únicos: membership(userId,tenantId), role(tenantId,name); se espera inicialización en seed.
- Guard: NODE_ENV development/test y DB `erp_dev`/`erp_test` o sus sufijos. Reset requiere además SEED_DEV=true; conserva IDs y no trunca colecciones. Como cualquier guard por nombre/entorno, no sustituye credenciales DB de mínimo privilegio.
- Salida del seed: configuración booleana, nombre DB y conteos, nunca URI/password.
- Arranque real verificado: `[DNS] Cloudflare configurado` → `[database] connected` → `[bootstrap] ... listening`. Readiness Atlas HTTP 200. Smoke usó puerto efímero en loopback y cerró servidor/conexión; el arranque normal mantiene sus defaults.
- La revisión automática exigió autorizaciones separadas para seed y para logins HTTP con actualizaciones lastLoginAt/audit. El usuario otorgó ambas y las verificaciones se completaron.

## Auditoría de consultas e infraestructura

Se inspeccionaron operaciones find/findOne/findById/updateOne/updateMany/deleteOne/deleteMany/aggregate/bulkWrite en API y worker. No hay repositorios persistentes de negocio en CRM/Sales/Inventory/etc. que filtrar todavía.

| Área | Clasificación de consultas |
|---|---|
| Auth User | Identidad global; búsquedas email/_id intencionales, seguidas de membership |
| IAM | Membership explícita user+tenant+status; roles limitados a tenant o system global; Permission catálogo global |
| Tenant profile | Path validado contra contexto, filtro tenantId actual + active |
| TenantScopedRepository / OrganizationRepository | Scope inalterable; regresión real Mongo demuestra filtros/create/update/delete aislados |
| Audit | Lectura siempre por tenant, filtros permitidos y límites; no endpoints update/delete |
| Countries | Exención global/shared explícita; no añadir tenantId a su almacenamiento |
| API outbox | Procesador interno de todos los tenants, eventId global; no endpoint cliente. No convertir sus consultas globales en recursos tenant-scoped por error |
| Worker legacy | Implementación de outbox/contratos distinta a la del API, sin propagación tenant consistente; publicación es parcial. Debe reconciliarse antes del vertical slice; no se certifica aislamiento extremo a extremo de jobs |

Los gates estáticos son heurísticos por convenciones, no un análisis semántico completo. Sus resultados se complementaron con inspección de consultas y pruebas reales del repositorio base.

## Audit log

Implementado: almacenamiento append-only a nivel de servicio, lectura filtrada por tenant con permission, eventos `auth.login.succeeded` y `auth.login.blocked` al alcanzar el bloqueo. Los payloads generados contienen tenantId/actorId/action/entityType, sin password ni token.

Pendiente: eventos de creación/suspensión membership, cambios de roles/permissions (no existen esos servicios de gestión), registro central de todos los rechazos, retención, protección append-only mediante permisos DB y auditoría de acciones administrativas externas. El schema admite before/after arbitrarios: futuros productores deben excluir secretos. No se afirma que todos los rechazos ya estén auditados.

## Matriz de pruebas exigida

Suite principal: `services/api/test/core-iam.test.ts`, HTTP real y MongoDB temporal. Reproducción inicial: 11 fallos reales, luego corregidos. El conjunto ampliado tiene 19 casos.

| Caso | Resultado final |
|---|---|
| A admin ACME + ACME | 200, tenant correcto; también Atlas |
| B admin GLOBAL + GLOBAL | 200, tenant correcto; también Atlas |
| C admin GLOBAL + ACME sin membership | 403; también Atlas |
| D token ACME + header GLOBAL | 403 en me/context/countries; también Atlas me |
| E token GLOBAL + header ACME | 403 en me/context/countries; también Atlas me |
| F usuario sin membership / recién registrado | 403 |
| G membership no activa | 403 (estado real del schema: disabled) |
| H SALES insuficiente para audit/escritura countries | 403; audit también Atlas |
| I permisos suficientes | Lectura countries y audit autorizado 200; también Atlas |
| J JWT expirado | 401 |
| K JWT inválido | 401 |
| L sin JWT | 401 |
| M sin x-tenant-id | 401 TENANT_CONTEXT_MISSING |

Cobertura adicional: tenant/user suspendidos, revocación con token vigente, segunda membership explícita, roles system ajenos, cambio inmediato de grants, inyección de tenant en repositorio, versiones optimistas/delete, 3 fallos concurrentes, bloqueo 15 min/recuperación, tipos de entrada, registro sin grants, JWT malformados firmados, regex RBAC, paginación audit, guard producción/DNS, seed CLI doble ejecución/reset seguro y contratos web/móvil.

Smoke Atlas adicional: login, me, context y countries para los 4 usuarios; SALES no ADMIN; audit ADMIN 200 y SALES 403; rechazo login GLOBAL→ACME y ambos mismatch. Ningún token se imprimió.

## Gates y clasificación de fallos

| Gate | Antes | Después |
|---|---|---|
| npm run typecheck | exit 0 | exit 0, sin caché |
| npm run lint | exit 2: faltaba eslint.config | exit 0; 1 warning preexistente de disable innecesario en validation |
| npm test | exit 1 por sandbox/esbuild | exit 0; **158 passed, 2 skipped** |
| npm run test:unit | exit 1 por sandbox/esbuild | exit 0; 158 passed, 2 skipped (scripts existentes repiten suites) |
| npm run test:integration | exit 0, sin tareas de test | exit 0; **42 passed** |
| npm run test:e2e | exit 0, sin tareas de test | exit 0; **27 passed** |
| npm run build | exit 0 | exit 0, 13 tareas, sin caché |
| npm run check | exit 0 | exit 0, incluye ahora OpenAPI |
| check:architecture | incluido en check inicial, exit 0 | exit 0; 67 archivos API, 0 warnings |
| check:imports | incluido en check inicial, exit 0 | exit 0; 124 archivos, 0 ciclos |
| check:tenant-scope | exit 0, defecto Windows identificado | exit 0; 0 violaciones / warnings |
| check:openapi | solo validación YAML documentada | exit 0; 39 operaciones, 208 refs resueltos |
| npm ls mongoose mongodb | Mongoose 8.24.4 con 6.20.0 anidado | exit 0; Mongoose 8.24.4 con 6.21.0 |

API final: 11 archivos, **72 pruebas**, todas pasan. Gates Turbo ejecutados con `--force`; no se ocultaron errores con `|| true`. Logs de ejecución completos disponibles en `%TEMP%/erp-audit-baseline` y `%TEMP%/erp-audit-final`; resumen durable en el JSON adjunto.

Clasificaciones explícitas:

- **Entorno:** esbuild requería acceso a directorios restringidos; pruebas repetidas con autorización y MongoDB temporal.
- **Test incorrecto preexistente:** `/me` esperaba anonimato HTTP 200 pese a la corrección previa; actualizado a 401. Test de unicidad User no esperaba creación de índice y fallaba intermitentemente; ahora espera `User.init()`.
- **Regresiones de implementación transitorias:** tipado BufferSource JWT y escape de regex durante edición; corregidos, build y suites repetidos en verde.
- **Worker, entorno/deuda preexistente:** 2 tests siguen skipped por ausencia de Redis/Mongo locales: `should publish integration events` y `should start and stop the outbox processor`. No cuentan como aprobados ni bloquean las pruebas API con Mongo temporal.
- **Jest legacy, preexistente/roadmap:** `npm run test:jest:integration` exit 1 (`jest` no instalado). Archivos bajo `tests/integration/api.auth.test.ts` importan `Email`, `Password`, `User`, `AuthLoginEvent` desde rutas inexistentes; otros tests security prueban funciones locales, no producción. No se añadieron clases ficticias ni se instalaron herramientas para fingir que son E2E. La suite ejecutable de esta fase está en API/paquetes Vitest y clientes. Esta deuda permanece visible.

## Matriz de madurez

E0 scaffold/ausente; E1 rutas/contratos; E2 servicio parcial; E3 persistencia/integración; E4 flujo acotado probado. E4 nunca significa módulo comercial completo.

| Módulo | Estado | Persistencia | Auth | Tenant | RBAC | Tests | OpenAPI | Problemas |
|---|---|---|---|---|---|---|---|---|
| Auth login/register/me | E4 acotado | User | Sí | Membership | Grants reales | HTTP/Mongo/Atlas | Vivo | Refresh/MFA/onboarding pendientes |
| IAM memberships/roles/permissions | E3 | Mongo + índices | Integrado login/request | Sí | Sí | Integrado en 19 casos | Gestión roadmap | Sin CRUD administrativo |
| Tenancy context/profile | E4 acotado | Tenant | Sí | Mismatch bloqueado | Membership | HTTP/Atlas/repositorio | Vivo | DB/cluster dedicado no enrutado |
| RBAC/policies | E3 | Grants de Role | Sí | Engine compara tenant | Middleware activo | Unit + HTTP | Permisos por ruta vivos | Policies empresariales no conectadas |
| Audit | E3 | Mongo | Sí | Sí | audit.read | Service + HTTP/Atlas | Vivo | Eventos IAM/retención/denegaciones pendientes |
| Master Data countries | E4 acotado | Mongo global | Sí | Contexto validado | Read/write | Upsert/list + Atlas read | Vivo | Gobernanza de catálogo global pendiente |
| CRM | E1 | No | Health protegido | Contexto | Sin acción de negocio | Sin flujo | Sin CRUD vivo | Tipos/health |
| Sales | E1 | No | Health protegido | Contexto | Sin acción de negocio | Sin flujo | Sin CRUD vivo | Tipos/health |
| Inventory | E1 | No | Health protegido | Contexto | Sin acción de negocio | Sin flujo | Sin CRUD vivo | Sin stock/reservas reales |
| Procurement (purchasing) | E1 | No | Health protegido | Contexto | Sin acción de negocio | Sin flujo | Sin CRUD vivo | Tipos/health |
| Finance | E1 | No | Health protegido | Contexto | Sin acción de negocio | Sin flujo | Sin CRUD vivo | Sin contabilidad/fiscal |
| HR | E1 | No | Health protegido | Contexto | Sin acción de negocio | Sin flujo | Sin CRUD vivo | Tipos/health |
| Manufacturing (production) | E1 | No | Health protegido | Contexto | Sin acción de negocio | Sin flujo | Sin CRUD vivo | Sin órdenes productivas |
| Projects | E1 | No | Health protegido | Contexto | Sin acción de negocio | Sin flujo | Sin CRUD vivo | Tipos/health |
| Assets | E0 ausente | No | N/A | N/A | N/A | No | No | No módulo API |
| Logistics | E1 | No | Health protegido | Contexto | Sin acción de negocio | Sin flujo | Sin CRUD vivo | Tipos/health |
| Service (field-service) | E1 | No | Health protegido | Contexto | Sin acción de negocio | Sin flujo | Sin CRUD vivo | Sin ejecución de servicio |
| Analytics | E0 ausente | No | N/A | N/A | N/A | No | No | Jobs de reports no son módulo funcional |
| Bookings / Eshop | E1 | No | Health protegido | Contexto | Sin acción de negocio | Sin flujo | Sin CRUD vivo | Tipos/health |
| Workflow | E0/E1 | No | N/A | Tipos | No | No flujo | No | Tipos/status |
| Events / API outbox | E3 parcial | Mongo outbox + bus memoria | Interno | Envelope tenant | Interno | Unit/Mongo | No HTTP | Worker no reconciliado |
| Worker jobs/notifications/exports | E2 mixto | Parcial | Interno | Incompleto | No business policy | 13 pass / 2 skip | No HTTP | Publicación parcial, repositorios stub |
| Web / móvil Auth | E2 | Store memoria | Header explícito | Selector | Servidor manda | 4 pruebas contrato | Consume login | Sin certificación UI/nativa end-to-end |

Packages revisados: auth, permissions, api-client, validation, contracts y estructura de shared/UI/utils/localization. Se reutilizaron hashing/JWT, engine RBAC y validadores. API client ya admite tenant header. No se cambiaron SDK Kotlin ni contratos empresariales roadmap. Typecheck/build del monorepo no equivalen a compilación Gradle Android ni a pruebas UI en dispositivo.

## Seguridad / secretos

- No había archivos tracked al inicio. Se escanearon además 355 candidatos de código/config/docs para URI con credenciales, claves privadas y JWT literales, reportando solo archivo/línea/tipo.
- Coincidencias: `.env.example:12` y `docs/architecture/DEVELOPMENT.md:53`, tipo URI de plantilla; ambas contienen marcadores placeholder. No se imprimieron sus valores.
- Contraseña demo en `scripts/seed-dev.ts` y secretos de tests/desarrollo son fixtures explícitas; producción bloquea el secreto JWT por defecto. No se alteraron secretos reales.
- `.gitignore` excluye `services/api/.env`, comprobado con `git check-ignore`; `.env.example` es plantilla y no está excluido.
- **Rotar credencial MongoDB Atlas antes de producción.**
- El análisis es de patrones, no garantía de ausencia absoluta de secretos. Hashing actual: PBKDF2-SHA256/100000 iteraciones; evaluar endurecimiento y rehash en una fase dedicada antes de producción. No se afirma bcrypt ni breach-checking implementado.

## Archivos modificados / añadidos

```text
package.json / package-lock.json / eslint.config.mjs
services/api/package.json
services/api/src/app.ts
services/api/src/bootstrap/dns-cloudflare.mjs
services/api/src/config/{index,database}.ts
services/api/src/platform/auth/{auth-app-service,auth.routes}.ts
services/api/src/platform/iam/{membership,role-models,authorization}.ts
services/api/src/platform/tenancy/{tenancy.routes,tenant-scoped-repository}.ts
services/api/src/platform/audit/{audit.routes,audit-service}.ts
services/api/src/modules/master-data/master-data.routes.ts
services/api/src/shared/middleware/{auth,tenant-context,error-handler,request-context}.middleware.ts
services/api/test/{core-iam,seed,runtime-security}.test.ts
services/api/test/{auth,auth-unit,tenancy,tenant-scoped-repository,master-data,health}.test.ts
services/api/test/helpers.ts
packages/auth/src/jwt.ts / packages/auth/tests/jwt.test.ts
packages/permissions/src/rbac.ts / packages/permissions/tests/rbac.test.ts
apps/{web,mobile}/src/store/auth-store.ts
apps/{web,mobile}/src/features/auth/LoginScreen.tsx
apps/web/test/auth-store.test.ts
scripts/{seed-dev.ts,package.json,check-tenant-scope.mjs,check-openapi.mjs,verify-core.ps1}
openapi/{erp-api.yaml,README.md}
docs/architecture/{SECURITY,TENANCY}.md (aviso de diseño histórico, contenido preservado)
docs/{CORE_IAM_TENANCY_AUDIT.md,CORE_IAM_GATES.json}
```

Cambios request-context: solo retiro de un eslint-disable ya innecesario. El YAML fue serializado de nuevo para corregir contratos y marcar operaciones; incluye cambios de formato. El lockfile conserva versiones ajenas y elimina únicamente la resolución MongoDB obsoleta, además de declarar dependencias internas/herramientas existentes.

## Riesgos restantes y siguiente fase

1. Rotación Atlas, gestión de secretos, TLS/deployment y privilegios DB siguen siendo tareas operativas; no se desplegó producción.
2. CRUD/onboarding IAM con sus propios permisos y eventos audit. Antes de migrar otra base, comprobar duplicados contra índices únicos; no hay deduplicación destructiva automática.
3. Gobernanza de escritura de catálogo global; ahora se exige permission explícita, pero todos los ADMIN demo tienen ese grant.
4. Policies por company/branch/importe, invalidación de sesiones/refresh, límites distribuidos y tratamiento de timing de login requieren una fase adicional. Errores de credenciales son genéricos; no se garantiza igualdad temporal entre usuario ausente y password incorrecta.
5. Reconciliar outbox del API y worker, propagación tenant, publicación fiable y pruebas con Redis; no conectar módulos de negocio a los stubs actuales.
6. Migrar/eliminar con decisión explícita los tests Jest heredados; no confundirlos con cobertura real. Completar UI Android/web y el resto de módulos.

Primer vertical slice recomendado tras esos prerrequisitos: **Customer → Sales Order → Inventory Check → Reservation → Audit**. Es coherente con tipos y módulos existentes, pero requiere persistencia CRM/Sales/Inventory, invariantes de reserva/concurrencia, permisos y eventos con tenant. No se implementó durante esta auditoría. La primera entrega debe demostrar aislamiento entre dos tenants y reserva sin sobreventa, antes de ampliar contabilidad o manufactura.

## Verificación manual

Con API en ejecución y seed DEV provisionado:

```powershell
npm run dev:api
# En otra terminal PowerShell 7:
./scripts/verify-core.ps1 -BaseUrl http://localhost:3000
```

El script pide la contraseña sin imprimirla y mantiene tokens en `$acmeToken`, `$globalToken`, `$salesToken`. Cubre los 10 escenarios solicitados mediante `/me`, `/tenants/context`, countries, login GLOBAL, accesos cruzados, grants insuficientes/suficientes, ambos mismatch y `/audit` como recurso tenant-scoped real. Solo imprime etiquetas y códigos HTTP; no serializa las respuestas de login. Sintaxis PowerShell validada; los escenarios equivalentes fueron ejecutados por HTTP real en Atlas.
