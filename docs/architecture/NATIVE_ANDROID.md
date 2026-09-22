# Native Android Documentation

**Document**: NATIVE_ANDROID.md  
**Version**: 1.0.0  
**Last Updated**: September 21, 2026  
**Status**: Active

## Overview

This document describes the Android-specific implementation details for the ERP Platform mobile application built with React Native.

## Android Project Structure

```
apps/mobile/
├── android/
│   ├── app/
│   │   ├── src/
│   │   │   ├── main/
│   │   │   │   ├── AndroidManifest.xml
│   │   │   │   ├── java/com/erp/mobile/
│   │   │   │   │   ├── MainApplication.java
│   │   │   │   │   ├── MainActivity.java
│   │   │   │   │   └── native/           # Native modules
│   │   │   │   ├── res/
│   │   │   │   │   ├── values/
│   │   │   │   │   ├── layout/
│   │   │   │   │   └── drawable/
│   │   │   │   └── assets/
│   │   ├── build.gradle.kts                # Module build config
│   │   └── proguard-rules.pro            # ProGuard configuration
│   ├── build.gradle.kts                   # Project build config
│   ├── settings.gradle.kts                # Settings
│   ├── gradle/
│   │   ├── libs.versions.toml            # Version catalog
│   │   └── wrapper/
│   │       ├── gradle-wrapper.properties
│   │       └── gradle-wrapper.jar
│   └── gradle.properties                  # Gradle configuration
└── src/                                   # React Native source code
```

## Native Modules

### Custom Native Modules
The following native modules are implemented for Android-specific functionality:

#### Biometric Authentication
- **Purpose**: Fingerprint and face authentication
- **API**: `react-native-biometrics` or custom native module
- **Usage**: Secure login and transaction approval
- **Configuration**:
```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
```

#### Push Notifications
- **Purpose**: Firebase Cloud Messaging integration
- **API**: `@react-native-firebase/messaging`
- **Configuration**:
```xml
<!-- AndroidManifest.xml -->
<service android:name=".MyFirebaseMessagingService">
    <intent-filter>
        <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
</service>
```

#### Camera and Image Picking
- **Purpose**: Document capture, image upload
- **API**: `react-native-vision-camera` or `expo-camera`
- **Permissions**: Camera, storage, microphone permissions

#### File System Access
- **Purpose**: Local file storage, document management
- **API**: `react-native-file-access` or `expo-file-system`
- **Permissions**: Storage read/write permissions

#### GPS and Location
- **Purpose**: Location-based services, delivery tracking
- **API**: `react-native-geolocation-service`
- **Permissions**: Location permissions (foreground and background)

#### Bluetooth and NFC
- **Purpose**: Device pairing, NFC-based authentication
- **API**: `react-native-bluetooth-classic` or `react-native-nfc-manager`
- **Permissions**: Bluetooth and NFC permissions

### Module Configuration
```typescript
// Native module bridge
export interface BiometricModule {
  isAvailable(): Promise<boolean>;
  authenticate(reason: string): Promise<boolean>;
  cancelAuthentication(): Promise<void>;
}
```

## Android-Specific Configuration

### Build Configuration (`build.gradle.kts`)
```kotlin
android {
    compileSdk = 34
    defaultConfig {
        applicationId = "com.erp.mobile"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "0.1.0"
    }
    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
        }
        release {
            minifyEnabled = true
            proguardFiles(getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro')
        }
    }
}
```

### Dependencies
```kotlin
dependencies {
    implementation("com.facebook.react:react-native:+)")
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.firebase:firebase-messaging:23.3.1")
    implementation("androidx.biometric:biometric:1.2.0-alpha05")
}
```

### Permissions
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

## Performance Optimization

### Android-Specific Optimizations
1. **Hermes Engine**: Enable Hermes for faster startup and optimized JavaScript execution
2. **ProGuard**: Code shrinking and obfuscation for production builds
3. **Native Code**: Use JNI for performance-critical operations
4. **Image Loading**: Use `FastImage` for optimized image loading
5. **Memory Management**: Monitor and optimize native memory usage
6. **Startup Time**: Optimize initial bundle loading and lazy loading

### Profiling Tools
- **Android Studio Profiler**: CPU, memory, network profiling
- **React Native Debugger**: Debug React Native specific issues
- **Flipper**: React Native debugging with plugins
- **Systrace**: System-level tracing

## Security Considerations

### Keychain and Secure Storage
- Use `react-native-keychain` for secure credential storage
- Biometric-protected keys for sensitive data
- Encrypted shared preferences for app preferences
- Certificate pinning for API connections

### Android-Specific Security
- **Keystore**: Store cryptographic keys in Android Keystore
- **SafetyNet**: Verify app integrity
- **Root Detection**: Prevent running on rooted devices for sensitive operations
- **Screenshot Prevention**: Prevent screenshots in sensitive screens
- **Secure Intent**: Use explicit intents to prevent intent injection

### Data Protection
- Encrypted local database (SQLCipher or encrypted Realm)
- Secure token storage in Android Keystore
- Clipboard clearing after sensitive operations
- Auto-lock after inactivity

## Deployment

### Build Process
1. **Development Build**: `npx react-native run-android`
2. **Debug Build**: `./gradlew assembleDebug`
3. **Release Build**: `./gradlew assembleRelease`
4. **App Bundle**: `./gradlew bundleRelease` for Play Store
5. **APK**: `./gradlew assembleRelease` for direct APK distribution

### App Store Requirements
- Google Play Developer account
- App signing (upload key or Google App Signing)
- Privacy policy URL
- Target SDK level compliance
- Accessibility compliance
- Performance benchmarks

### Release Process
1. Update version code and version name
2. Run test suite on Android
3. Create release build
4. Upload to Google Play Console
5. Configure rollout (staged release)
6. Monitor crash reports and analytics
7. Rollback if issues detected

## Testing on Android

### Device Testing
- Physical Android devices (various API levels)
- Android Emulator for quick testing
- Firebase Test Lab for cloud-based testing
- Screen size and density testing

### Automated Testing
- Detox for end-to-end testing
- Jest unit tests
- React Native Testing Library component tests
- Native UI tests via Espresso (if applicable)

### Continuous Integration
- GitHub Actions or GitLab CI for Android builds
- Automated build and test on each commit
- APK generation for internal testing
- Crash reporting via Firebase Crashlytics

## Related Documents
- [Architecture Documentation](ARCHITECTURE.md)
- [Frontend Architecture](FRONTEND_ARCHITECTURE.md)
- [Development Guide](DEVELOPMENT.md)
- [ADR-004: React Native Web](ADR/ADR-004-react-native-web.md)
