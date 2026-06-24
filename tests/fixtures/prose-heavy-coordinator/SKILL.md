---
name: prose-heavy-coordinator
description: >
  A planted fixture: a coordinator with excessive inlined domain logic.
layer: coordinator
---

# Prose-Heavy Coordinator (Planted Fixture)

This fixture simulates a coordinator with excessive prose that should trigger L1-6 warnings.

## Domain Logic (Should Not Be Here)

The user authentication flow follows a multi-step process. First, the system validates the user's credentials against the database. This involves querying the users table and comparing the hashed password. The hashing algorithm used is bcrypt with a work factor of 12, which provides adequate security against brute-force attacks while maintaining acceptable performance characteristics.
Next, the system checks if the account is active and not locked. If the account has been locked due to too many failed login attempts, the user must wait 30 minutes or contact support. The failed login counter is stored in Redis with an appropriate TTL to ensure automatic unlocking.
After successful authentication, the system generates a JWT token with the following claims: user_id, email, roles, and expiration timestamp. The token is signed using RS256 with the private key stored in the secrets manager. The public key is available at the JWKS endpoint for verification by downstream services.
The session management layer maintains a mapping of active sessions in Redis. Each session has a 24-hour sliding expiration window that resets on each authenticated request. When a user logs out, the session is immediately invalidated and added to a blocklist to prevent token replay attacks.
For multi-factor authentication, the system supports both TOTP and SMS-based codes. TOTP is preferred as it doesn't depend on carrier reliability. The TOTP secret is generated during enrollment and stored encrypted in the database. The time window for code validation is 30 seconds with a drift tolerance of one period to account for clock skew.
The authorization layer uses RBAC with hierarchical role inheritance. Permissions are cached in memory with a 5-minute TTL to reduce database load. When permissions change, a cache invalidation event is published to all application instances via Redis pub/sub to ensure consistency.
Rate limiting is enforced at multiple levels including per-IP, per-user, and per-endpoint. The limits are stored in Redis using a sliding window algorithm. Suspicious patterns trigger additional verification steps like CAPTCHA or email verification codes.
Password reset flows require email verification with time-limited tokens. The tokens expire after 15 minutes and can only be used once. After a successful reset, all existing sessions are invalidated to prevent unauthorized access.
Account lockout policies are configurable per tenant. The default is 5 failed attempts in 10 minutes triggers a 30-minute lockout. Security admins can adjust these thresholds based on their risk profile.
Two-factor authentication enrollment requires the user to scan a QR code containing the TOTP secret. They must then verify by entering a valid code to complete enrollment. Backup codes are generated and displayed once for the user to save.
Session tokens are rotated every hour to minimize the impact of token theft. The old token remains valid for 5 minutes to prevent race conditions during the rotation window.
Audit logging captures all authentication events including successful logins, failed attempts, lockouts, password changes, and MFA enrollment. Logs are shipped to the SIEM system for security monitoring.
API rate limits are enforced using the token bucket algorithm with separate buckets for different endpoint categories. Critical endpoints have stricter limits than general-purpose ones.
Cross-origin requests are validated against a whitelist of allowed origins stored in the configuration service. The whitelist can be updated without code deployment.
Security headers are set on all responses including CSP, HSTS, X-Frame-Options, and X-Content-Type-Options to protect against common web vulnerabilities.

## What This Should Have Been

This coordinator should just dispatch to capabilities and consolidate their outputs, with minimal routing logic and no inlined domain implementations.
