# ERP Kotlin Client

Native Kotlin client layer for the ERP Platform API. Targets JVM 17 bytecode and is consumable from
Android apps (or any JVM host). It mirrors the API's real response envelope
(`{ data, meta, correlationId }` / `{ error: { code, message, details }, correlationId }`).

## Layout

```
gradle/libs.versions.toml        Version catalog
src/main/kotlin/com/erp/client/
  Envelope.kt                    Envelope / ApiErrorBody / ErpApiException
  HttpTransport.kt               Transport abstraction + request/response models
  JavaHttpTransport.kt           HttpURLConnection implementation (JVM + Android)
  TokenStore.kt                  AuthTokens + storage interface (Keystore-backed in Android)
  ErpClient.kt                   Typed endpoint methods
  dto/Dtos.kt                    Serializable DTOs matching the API
src/test/kotlin/com/erp/client/
  EnvelopeTest.kt / ErpClientTest.kt / TestSupport.kt
```

## Build & test

```bash
# requires JDK 17+ (Gradle auto-detects via JAVA_HOME)
gradle build          # or: gradle test
```

## Usage

```kotlin
val client = ErpClient(
    baseUrl = "http://localhost:3000",
    transport = JavaHttpTransport(),
    tokenStore = MyKeystoreTokenStore(),
)

val tokens = client.login("admin@acme.io", "Demo123!")
client.register("a@b.io", "Secret123!", "A", "B")
client.status()

val countries = client.countries()
val country = client.upsertCountry("MX", "Mexico")
client.tenantContext()
client.tenantProfile("tenant-acme")
client.audit(limit = 20)
```

Authenticated requests automatically attach `Authorization: Bearer <token>` and, when known,
`x-tenant-id: <tenantId>`. Store the tenant id via `TokenStore` after tenant selection so the
header is sent on subsequent calls.

## Error handling

`ErpClient` throws `ErpApiException(statusCode, code, message, details)`:

- API error envelopes map to their `code` (e.g. `NOT_FOUND`, `TENANT_CONTEXT_MISSING`, `VALIDATION_ERROR`).
- Missing stored token produces `ErpApiException(401, "NO_TOKEN", ...)`.
- Success responses with no `data` produce `ErpApiException(..., "EMPTY_BODY", ...)`.

## Android integration

- The module is bytecode target JVM 17 (Android 8+/API 26+ compatible) and avoids Android SDK APIs in
  the core; bring your own `HttpTransport` (OkHttp) and `TokenStore` (EncryptedSharedPreferences /
  Android Keystore).
- `NATIVE_ANDROID.md` documents the React Native app native layer; this client is the API-facing core
  for a native Kotlin module or a standalone Android app.