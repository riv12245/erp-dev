# ERP-DEV — Preparación para Despliegue (Release Readiness)

---

## 1. Backend y Workers (`services/api`, `services/worker`)
- [x] **Endpoints de Salud:** `/health`, `/health/live`, `/health/ready`
- [x] **Configuración de Entorno:** Variables `MONGODB_URI`, `REDIS_URL`, `JWT_SECRET`, `CORS_ORIGIN`
- [x] **Manejo de CORS y Cookies:** Soporte HttpOnly para refresh tokens en Web.
- [x] **Worker Isolation:** `services/worker/.env` configurado de forma independiente.

---

## 2. Aplicación Web (`apps/web`)
- [x] **Build de Producción:** Generado con Vite v7.3.6 en `apps/web/dist`
- [x] **Soporte de Variables:** Variable de entorno `VITE_API_URL`
- [x] **Single Page Application:** Configuración de fallback `index.html` para rutas en servidor web.

---

## 3. Aplicación Móvil Android (`apps/mobile`)
- [x] **Metro JavaScript Bundle:** Bundling verificado (`npm run bundle:android -w @erp/mobile`)
- [x] **Soporte de URL API Nativa:** `configureApi(NativeModules.ErpConfig.API_BASE_URL)`
- [x] **Compilación Nativa CI:** Verificada compilación Gradle en GitHub Actions (`erp-android-debug`).
