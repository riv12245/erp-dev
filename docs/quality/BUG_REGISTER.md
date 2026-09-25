# ERP-DEV — Registro de Incidencias (Bug Register)

---

## Incidencia BUG-001: Evaluación Temprana de URL Base en Cliente de Autenticación Móvil

- **ID:** BUG-001
- **Módulo Afectado:** `apps/mobile/src/services/api-config.ts`
- **Ubicación:** `apps/mobile/src/services/api-config.ts`
- **Severidad:** P1 (Alta)
- **Descripción:** `authClient` captura `getApiBaseUrl` al momento del `import`, lo que podía ocasionar que si un módulo importaba `authClient` antes de que `index.js` ejecutase `configureApi(NativeModules.ErpConfig.API_BASE_URL)`, la URL base se mantuviera fijada en la constante predeterminada (`http://10.0.2.2:3000`).
- **Comportamiento Esperado:** `authClient` debe evaluar `getApiBaseUrl()` dinámicamente en cada petición HTTP realizada.
- **Comportamiento Observado:** `authClient` utilizaba `baseUrl: getApiBaseUrl`, pero faltaba cobertura de pruebas unitarias que certificaran la reconfiguración dinámica en el flujo de arranque de React Native.
- **Causa Raíz:** Falta de suite de regresión unitaria e integración en el workspace `@erp/mobile` para la configuración de API.
- **Corrección Aplicada:** Verificación de `baseUrl: getApiBaseUrl` en `api-config.ts` y adición de suite de pruebas `apps/mobile/test/api-config.test.ts`.
- **Prueba de Regresión:** `apps/mobile/test/api-config.test.ts`
- **Estado:** Cerrado
- **Commit/PR:** `audit/erp-integral-hardening`
