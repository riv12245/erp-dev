> **Estado 2026-09-22:** el texto histórico de abajo describe objetivos de diseño, no una certificación de implementación. La fuente actual es [FOUNDATION_EXECUTION](FOUNDATION_EXECUTION.md), [SESSION_INTEGRATION](SESSION_INTEGRATION.md) y el [contrato API](../../openapi/README.md). Sesiones Mongo, refresh opaco con hash/rotación y revocación están implementados; MFA y gestión IAM siguen pendientes. Se conservan PBKDF2, registro sin tenant y roles ADMIN/SALES. CSRF web usa cookie Strict más Origin exacto, no el mecanismo de tokens del diseño histórico. Quedan 20 alertas npm y validación en dispositivo; no hay certificación de producción.

# Security Documentation

**Document**: SECURITY.md  
**Version**: 1.0.0  
**Last Updated**: September 21, 2026  
**Status**: Active

## Overview

This document describes the security architecture, policies, and practices of the ERP Platform. Security is a first-class concern at every layer of the application.

## Security Architecture

### Defense in Depth
Security is implemented at multiple layers:

1. **Network Layer**: TLS, firewall rules, DDoS protection
2. **Application Layer**: Authentication, authorization, input validation
3. **Data Layer**: Encryption at rest, access control, audit logging
4. **Infrastructure Layer**: Hardening, patching, monitoring

### Threat Model
| Threat | Mitigation |
|--------|-----------|
| Unauthorized access | JWT authentication, RBAC |
| Data breach | Encryption, tenant isolation |
| Injection attacks | Input validation, parameterized queries |
| CSRF | Same-origin policy, CSRF tokens |
| XSS | Output encoding, Content Security Policy |
| DDoS | Rate limiting, CDN, cloud protection |
| Token theft | Short-lived tokens, refresh rotation |
| Privilege escalation | RBAC, permission checks, audit logging |
| Data leakage | Masking, encryption, access controls |

## Authentication

### JWT Authentication
- **Access Tokens**: Short-lived (15 minutes), contain user ID, tenant ID, roles, and permissions
- **Refresh Tokens**: Long-lived (7 days), stored securely, rotated on use
- **Token Format**: JWT with RS256 or HS256 signing
- **Storage**: Refresh tokens in secure, HTTP-only cookies or secure storage

### Multi-Factor Authentication (MFA)
- Optional MFA for enhanced security
- TOTP-based (Google Authenticator, Authy)
- SMS-based (less secure, fallback only)
- MFA requirements configurable per tenant plan

### Password Policies
- Minimum 8 characters
- Must include uppercase, lowercase, number, and special character
- Bcrypt hashing with 12 rounds
- Password breach checking against known databases
- Password expiration and history policies

## Authorization

### Role-Based Access Control (RBAC)
- System roles: `super_admin`, `admin`, `manager`, `user`, `viewer`
- Custom roles per tenant
- Permissions are assigned to roles, users assigned to roles
- Deny-by-default policy

### Permission Structure
```
resource:action[:condition]
```
Examples:
- `users:read` - Read user data
- `users:write` - Create/update user data
- `users:delete` - Delete user accounts
- `tenants:admin` - Full tenant administration
- `finance:approve` - Approve financial transactions

### Permission Enforcement
- Permissions checked at the controller/middleware level
- All API endpoints have defined permission requirements
- Permission checks happen before business logic execution
- Audit logging captures all authorization decisions

## Input Validation

### Request Validation
- All inputs validated using Joi schemas
- Validation happens before any business logic
- Type checking, range checking, format validation
- Sanitization of all string inputs
- Maximum payload size enforcement

### Validation Examples
- Email format validation
- UUID format for IDs
- Currency code validation (ISO 4217)
- Date format validation (ISO 8601)
- Array size limits
- String length limits

### Content Security
- No HTML/JavaScript in text fields (XSS prevention)
- SQL/NoSQL injection prevention
- File upload validation (type, size, content)
- URL validation for external references

## Data Protection

### Encryption
- **At Rest**: MongoDB encryption at rest enabled
- **In Transit**: TLS 1.3 for all communications
- **Sensitive Fields**: PII encrypted with AES-256
- **Encryption Keys**: Managed via key management service (KMS)

### Data Classification
| Classification | Examples | Protection |
|---------------|----------|-----------|
| Public | Company name, product catalog | Standard |
| Internal | Employee data, business metrics | Standard + access control |
| Confidential | Financial data, customer PII | Encryption + strict access |
| Restricted | Tax IDs, payment info | Encryption + additional controls |

### Data Retention
- **Audit logs**: 7 years (2,555 days)
- **Financial records**: Per regulatory requirements
- **User data**: Until account deletion
- **Session data**: Until session expiration
- **Temporary files**: 24 hours

## API Security

### Rate Limiting
- Per-tenant rate limits
- Default: 100 requests per 15 minutes (FREE), higher for premium plans
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- 429 status code when limit exceeded
- Burst protection and sustained rate limiting

### CORS Configuration
- Origin whitelist per environment
- Credentials allowed for authenticated endpoints
- Preflight requests handled correctly
- Strict origin validation in production

### HTTP Headers
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### API Key Management
- API keys for machine-to-machine communication
- Key rotation policy (90 days)
- Scope restrictions per API key
- Usage monitoring and alerts
- API key revocation capability

## Infrastructure Security

### MongoDB Security
- Authentication enabled with SCRAM-SHA-256
- Network isolation (VPC, no public access)
- TLS for all connections
- Role-based access control in MongoDB
- Audit logging enabled in MongoDB
- Backup encryption
- Point-in-time recovery

### Redis Security
- Password authentication
- TLS for connections
- Network isolation
- Key-based access control
- No exposed Redis commands

### Environment Security
- Secrets managed via environment variables (or Vault in production)
- `.env` files excluded from git
- No secrets in code or configuration files
- Environment-specific configuration
- Secret rotation procedures documented

## Audit and Compliance

### Audit Logging
- All data modifications logged
- Login attempts logged (success and failure)
- Permission changes logged
- Administrative actions logged
- Audit entries include actor, action, timestamp, IP, tenant
- Log integrity verified via hash chains

### Compliance Requirements
- **SOC 2**: Type II compliance target
- **GDPR**: Data protection and right to erasure
- **HIPAA**: For healthcare-related modules
- **PCI DSS**: For payment processing modules
- **ISO 27001**: Information security management

### Security Monitoring
- Real-time security event monitoring
- Intrusion detection and alerting
- Anomaly detection for unusual access patterns
- Security Information and Event Management (SIEM) integration
- Regular security audits and penetration testing

## Incident Response

### Security Incident Classification
1. **Critical**: Data breach, system compromise
2. **High**: Unauthorized access attempt, privilege escalation
3. **Medium**: Policy violation, configuration issue
4. **Low**: Minor policy violation, informational

### Response Procedures
1. Detect and alert
2. Contain and mitigate
3. Investigate and assess impact
4. Eradicate the threat
5. Recover and restore
6. Post-incident review and lessons learned

### Data Breach Response
1. Immediate notification to security team
2. Assessment of scope and impact
3. Regulatory notification within required timeframes
4. User notification if PII is compromised
5. Remediation and prevention measures
6. Post-incident documentation

## Security Testing

### Automated Security Testing
- SAST (Static Application Security Testing) in CI/CD
- DAST (Dynamic Application Security Testing) regularly
- Dependency vulnerability scanning (npm audit)
- Secret scanning in code repositories
- Container image scanning

### Manual Security Testing
- Annual penetration testing
- Code review security checklist
- Security training for developers
- Bug bounty program (planned)

## Related Documents
- [Architecture Documentation](ARCHITECTURE.md)
- [ADR-006: RBAC Policies](ADR/ADR-006-rbac-policies.md)
- [Database Documentation](DATABASE.md)
- [Development Guide](DEVELOPMENT.md)
