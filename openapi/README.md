# ERP API: contrato implementado y roadmap

Actualizado: 2026-09-22. Evidencia y límites actuales: [registro de ejecución](../docs/architecture/FOUNDATION_EXECUTION.md) y [sesiones](../docs/architecture/SESSION_INTEGRATION.md). La auditoría anterior es histórica.

## Inicio

Desde la raíz: `npm ci --ignore-scripts --no-audit`, `npm run deps:prepare`, `npm run build:api` y `npm run dev:api`. La API carga services/api/.env; nunca versionarlo. JWT_SECRET debe ser aleatorio, explícito y de al menos 32 caracteres.
La base URL local es http://localhost:3000. Las rutas de negocio incluyen /api/v1.
Node 24.18.0 fue el runtime verificado. El seed usa tsx y reutiliza modelos del API.

## Auth / IAM / Tenancy

- POST /api/v1/auth/register es público; recibe email/password/firstName/lastName, devuelve HTTP 200 con data.userId y data.email. No crea membership ni emite token. Email máximo 254, contraseña 8–4096 caracteres con mayúscula, minúscula y dígito; nombres máximo 100.
- POST /api/v1/auth/login es público respecto al JWT, pero exige x-tenant-id. Devuelve accessToken, user, tenantId, sessionId y expiresIn. Nativo recibe también refreshToken; web sólo cookie HttpOnly. `x-session-client: web` exige Origin exacto permitido; nativo rechaza Origin de navegador.
- POST /api/v1/auth/refresh rota la credencial y devuelve el mismo contrato de sesión; el tenant viene de Mongo, sin header requerido. Reutilización conocida revoca la familia. POST /auth/logout revoca la sesión con refresh; POST /auth/logout-all exige Bearer + tenant y revoca todas las sesiones del usuario global. Ambos devuelven data.revoked=true.
- Login verifica credenciales, usuario, tenant activo y membership activa. Sin membership devuelve 403. Sin contexto devuelve 401 TENANT_CONTEXT_MISSING. Credenciales inválidas, usuario suspendido o bloqueo devuelven 401.
- GET /api/v1/auth/me exige JWT y tenant; devuelve requesterId, tenantId, email, roles y permissions efectivos.
- JWT HS256: sub, sid, tenantId, roles, iat, exp. Se verifica firma, cabecera, tipos y expiración. Roles del token son informativos; el servidor consulta sesión e IAM en cada petición. Los permisos no viajan en JWT. Tokens sin sid anteriores a esta versión requieren nuevo login.
- Orden protegido: contexto → JWT → coincidencia tenant → usuario/membership/tenant activos → IAM actual → permission → recurso.
- Token/header distintos devuelven 403, también para países globales. No hay tenant por defecto ni bypass ADMIN.
- Membership usa roleNames y status active/disabled. Rol tenant-specific prevalece sobre rol system del mismo nombre. Un rol system solo es global si no tiene tenantId. Role.permissions es la fuente de grants; permissions es el catálogo descriptivo.
- AUTH_BRUTE_FORCE_MAX (default 5) es independiente del límite HTTP RATE_LIMIT_MAX. Contador atómico y bloqueo de 15 minutos.

## Rutas disponibles

| Ruta | Autorización | Persistencia/alcance |
|---|---|---|
| /health, /health/live, /health/ready, /api/v1/status | Públicas | Readiness comprueba Mongo |
| GET /api/v1/tenants/context | JWT + tenant + membership | company/branch son metadatos, no permisos independientes |
| GET /api/v1/tenants/{tenantId} | JWT + mismo tenant | Perfil del tenant actual; otro ID devuelve 403 |
| GET /api/v1/master-data/countries | master-data.country.read | Datos globales, meta.count, sin paginación |
| POST /api/v1/master-data/countries | master-data.country.write | Upsert GLOBAL visible a todos los tenants |
| GET /api/v1/audit | audit.read | Filtrado tenant, entityType, actorId; limit 1..100 y offset >=0 |
| GET /api/v1/{module}/health | JWT + tenant + membership | Solo informa skeleton; no representa funcionalidad empresarial |

Los health de módulo existen para sales, crm, inventory, finance, eshop, hr, projects, purchasing, logistics, production, bookings y field-service.

## Seed

npm run seed:dev crea/actualiza 3 tenants, 4 usuarios demo, 6 roles tenant-scoped, 3 permisos y 4 memberships.
Admin ACME/GLOBAL/LABS recibe ADMIN en su tenant; sales@acme.io recibe SALES en ACME y solo lectura de países.
Solo admite development/test y bases erp_dev o erp_test (también sufijos separados por underscore). SEED_PASSWORD permite sustituir la contraseña demo; el seed nunca la imprime.
--reset requiere además SEED_DEV=true: reinicia grants demo y bloqueo de usuarios demo, conserva sus IDs y los datos ajenos. No vacía colecciones.
Los índices únicos de membership (userId, tenantId) y rol (tenantId, name) requieren resolver duplicados existentes antes de despliegue; el seed falla en vez de borrarlos automáticamente.

## Límites y roadmap

Los CRUD de tenants/companies/users/roles/permissions, gestión de memberships, onboarding y MFA no están implementados. Cada operación futura del YAML lleva x-implementation-status: roadmap.
El audit registra login, bloqueo, refresh, reutilización y logout. Los rechazos 401/403 registran código y correlationId sin credenciales. Eventos de futura gestión IAM siguen pendientes.
Web/móvil envían tenant explícito, pero no se certifica despliegue nativo Android ni flujo UI completo en dispositivo.
El workaround Cloudflare se conserva para desarrollo; NODE_ENV=production nunca lo aplica y LOCAL_CLOUDFLARE_DNS=false lo desactiva localmente.
JWT_SECRET explícito de al menos 32 caracteres es obligatorio en todos los entornos. El hash real es PBKDF2-SHA256, no bcrypt. BCRYPT_ROUNDS y JWT_REFRESH_SECRET ya no se consumen; JWT_REFRESH_EXPIRES_IN configura la duración absoluta del refresh opaco.

## Respuestas y validación

Éxito: { data, meta?, correlationId }. Error: { error: { code, message, details? }, correlationId }. No se emite success.
El limitador HTTP devuelve 429 con código RATE_LIMITED dentro del envelope. JSON malformado devuelve 400 y cuerpos demasiado grandes 413, ambos con VALIDATION_ERROR y correlationId.

npm run check:openapi valida YAML, todas las referencias, operationIds, parámetros y clasificación implementado/roadmap. No sustituye una certificación completa del esquema OpenAPI.
Los comandos y escenarios manuales están en [verify-core.ps1](../scripts/verify-core.ps1); no imprimen tokens.
