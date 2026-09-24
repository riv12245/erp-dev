# Android development

The native project lives in `apps/mobile/android` and matches React Native 0.74.5 (CLI 13, Gradle 8.6, Java 17, Android SDK 34). The old manifest under `src/android` was disconnected from Gradle and has been replaced by the actual application project.

From the repository root:

```sh
npm ci --ignore-scripts --no-audit
npm run deps:prepare
npm run build
npm run bundle:android -w @erp/mobile
npm run android -w @erp/mobile
```

Start the API separately and run `npm run dev:mobile` for Metro. The debug APK uses Metro; the standalone bundle command validates JavaScript packaging but does not turn a debug APK into a release build.

The emulator defaults to `http://10.0.2.2:3000`. For a device, compile with a reachable API address:

```sh
cd apps/mobile/android
./gradlew :app:assembleDebug -PERP_API_URL=http://192.168.1.20:3000
```

`ErpConfig` exposes the compiled API URL to JavaScript before the app registers. HTTP cleartext is allowed only in the debug manifest. Release tasks require an explicit HTTPS API URL. Release signing, store delivery and device-level end-to-end validation remain separate work; no signing keys are committed.

CI builds an x86_64 debug APK and uploads `erp-android-debug`. This verifies native compilation, not installation or login on a physical device. Metro uses two workers and explicit monorepo module paths to avoid resolving the web application's React version.

## Secure session storage

`ErpSecureSessionModule.kt` is registered through `ErpConfigPackage`. It encrypts the rotating refresh token with AES/GCM using an Android Keystore AES key and stores ciphertext/IV in private preferences. Access tokens remain in JavaScript memory. App startup reads the encrypted credential and calls refresh before rendering authenticated navigation. Logout persists a signed-out marker and removes the credential even when the server cannot be reached; remote revocation requires connectivity. Keystore read/decryption failure clears the saved ciphertext and blocks automatic restore. There is no Expo dependency or plaintext fallback. The existing manifest disables Android backup.

Native compilation and JavaScript unit tests cannot establish on-device Keystore behavior. Validate login, process death/restart, rotation, offline logout/restart and key invalidation on an emulator/device before claiming that evidence.

Local validation on 2026-09-22: web/mobile TypeScript checks, the shared API client build, all 23 web tests (including 3 real HTTP/Mongo session integration tests), and `npm run bundle:android -w @erp/mobile` passed. `gradlew.bat :app:assembleDebug -PreactNativeArchitectures=x86_64` passed, including the application's Kotlin compilation, producing `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`. Gradle resolved standard Maven dependencies and automatically provisioned required NDK 26.1.10909125, Build-Tools 34.0.0 and Platform 34 into the existing Android SDK using its accepted licenses. No production endpoint or signing configuration was changed. This is debug build evidence, not device installation or Keystore runtime evidence.

## Dependency boundary

Vite, Vitest, the web router and CSV parser were updated, and the worker now uses Node's built-in UUID generator. The retained React Native 0.74 toolchain still has transitive dependency advisories, including Metro/image-size. Do not describe this foundation as security-clean. A native framework upgrade needs its own compatibility and device validation; forcing incompatible transitive major versions is not a valid remediation.
