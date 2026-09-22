# ADR-004: React Native Web for Mobile Development

**Status**: Accepted  
**Date**: September 21, 2026  
**Deciders**: Platform Engineering Team  
**Domain**: Frontend Architecture

## Context

The ERP Platform needed mobile applications for iOS and Android. The team had strong React expertise for the web application. We needed to choose a mobile development approach that maximizes code sharing, maintains performance, and provides a native-quality user experience.

Key requirements:
- Cross-platform support (iOS and Android)
- Code sharing with the web application
- Native performance and UI quality
- Offline capability support
- Access to native device features (camera, GPS, push notifications)
- Fast development iteration cycle

## Decision

We will use **React Native** for mobile application development, enabling maximum code sharing between web and mobile platforms. React Native allows us to write React components that compile to native UI components on each platform.

### Approach
- **Shared codebase**: Business logic, state management, and API client shared between web and mobile
- **Platform-specific UI**: Platform-specific adaptations where native UX patterns differ
- **React Native Web**: Where possible, use React Native Web to share component code across web and mobile
- **Expo or bare workflow**: Evaluate based on native module requirements

### Code Sharing Strategy
```
apps/web/          ───┐
                     ├── Shared (packages/)
apps/mobile/       ───┘
```

- **Shared packages** (`packages/`): Business logic, validation, API clients, utilities
- **Shared UI** (`packages/ui/`): Component library with web and mobile variants
- **Platform-specific**: UI components adapted for each platform
- **Native modules**: Use native modules for camera, GPS, biometric auth when needed

## Consequences

### Positive
- **Code sharing**: Up to 70-80% code sharing between web and mobile
- **Faster development**: Single team can work on both platforms
- **Consistent UX**: Shared design language across platforms
- **Native performance**: Compiled to native components, not web views
- **Access to native APIs**: Bridge to native modules for device features
- **Large ecosystem**: Rich library ecosystem for React Native
- **Hot reload**: Fast development iteration

### Negative
- **Performance overhead**: Bridge communication between JS and native
- **Complex native integrations**: Some features require custom native code
- **Learning curve**: React Native has unique patterns vs React web
- **Debugging complexity**: Debugging native issues requires platform-specific tools
- **Bundle size**: Mobile apps have larger bundle sizes than web
- **Platform updates**: React Native updates require coordination with platform releases

### Mitigations
- Optimize native module usage to minimize bridge traffic
- Maintain a clear separation between shared and platform-specific code
- Invest in native development knowledge for complex features
- Use Hermes engine for better performance
- Monitor and optimize bundle size regularly

## Alternatives Considered

### Flutter / Dart
- **Rejected because**: New language (Dart) would require team retraining, smaller ecosystem than React, and less alignment with existing React web expertise.

### Progressive Web App (PWA)
- **Rejected because**: Limited native device access, performance limitations compared to native apps, and inability to publish to app stores effectively.

### Ionic / Capacitor
- **Rejected because**: Web-based rendering in a native wrapper doesn't provide true native performance or UX.

### Separate Native Apps (Swift/Kotlin)
- **Rejected because**: Doubles development effort, no code sharing with web, and requires separate iOS and Android teams.

### KMP (Kotlin Multiplatform)
- **Rejected because**: Business logic sharing is limited to specific use cases, and the React web codebase would need significant refactoring.

## Technical Architecture

### Mobile App Structure
```
apps/mobile/
├── src/
│   ├── navigation/     # React Navigation setup
│   ├── screens/        # Screen components
│   ├── components/     # Shared and platform-specific components
│   ├── hooks/          # Custom React hooks
│   ├── services/       # API services (shared from packages)
│   ├── store/          # State management
│   ├── utils/          # Platform utilities
│   └── native/         # Native module bridges
├── App.tsx
└── index.tsx
```

### Shared Packages
- `packages/api-client`: HTTP client for API communication
- `packages/auth`: Authentication utilities
- `packages/validation`: Input validation schemas
- `packages/localization`: Internationalization
- `packages/permissions`: RBAC utilities
- `packages/design-tokens`: Shared design values
- `packages/ui`: Shared component library

## Related ADRs
- ADR-001: Modular Monolith Architecture
- ADR-007: TypeScript Strict Mode
