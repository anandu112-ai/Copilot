# security.md

# CA Copilot — Security Architecture & Data Protection

## Purpose

CA Copilot is designed for Chartered Accountants, audit firms, finance teams, and tax professionals handling highly sensitive financial information. The security model prioritizes **privacy, integrity, availability, and auditability** while maintaining an offline-first architecture.

---

# Security Principles

The platform is built around the following principles:

* Offline-first by default
* Privacy-first design
* Least privilege access
* Defense in depth
* Secure-by-default configuration
* Complete auditability
* Modular security architecture
* Zero mandatory cloud dependency

---

# Security Architecture

```text
                User
                  │
                  ▼
        React Desktop UI
                  │
                  ▼
        Electron IPC (Validated)
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
 Native Desktop APIs   FastAPI Backend
                            │
                            ▼
                  Business Logic Layer
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
          SQLite Databases        Local File Storage
```

All sensitive operations are routed through trusted backend services or validated Electron IPC channels. The renderer process never receives unrestricted filesystem or operating system access.

---

# Authentication

Current implementation:

* Local user accounts
* bcrypt password hashing (12 salt rounds)
* JWT-based authentication
* Session persistence
* Remember Me
* Secure logout
* Password strength validation
* Email uniqueness validation
* Account status management
* Session expiration

Passwords are **never** stored in plaintext.

---

# Authorization

Supported roles:

* Admin
* Chartered Accountant
* Staff
* Client (future)

Role-based authorization applies to:

* User management
* Firm management
* Reports
* Client access
* Administrative settings
* Backup and restore
* System diagnostics

Authorization checks must be enforced by the FastAPI backend rather than relying solely on frontend controls.

---

# Session Security

Sessions include:

* JWT access token
* Expiration timestamp
* User identifier
* Role information

Recommendations:

* Validate session on application startup.
* Automatically revoke expired sessions.
* Rotate tokens after password changes.
* Invalidate all active sessions when an account is locked or disabled.

Future enhancement:

* Refresh-token rotation with device-aware session tracking.

---

# Password Policy

Minimum requirements:

* Minimum length: 8 characters
* Uppercase letter
* Lowercase letter
* Number
* Special character

Recommended enterprise policy:

* 12+ characters
* Password history
* Password expiration (optional)
* Failed login monitoring

Passwords should never be logged or transmitted outside the local system.

---

# Database Security

SQLite databases:

* `ca_copilot.db`
* `reconciliation.db`

Future:

* `ai_cache.db`
* `audit_history.db`

Security measures:

* Prepared statements
* Foreign-key enforcement
* Transactional writes
* Database integrity checks
* Regular backups
* Optional encryption at rest (future)

---

# File Storage Security

Uploaded documents remain on the local machine.

Recommendations:

* Store files outside the application binaries.
* Use generated internal identifiers rather than user-supplied filenames.
* Preserve original filenames as metadata only.
* Validate file extensions and MIME types.
* Calculate SHA-256 checksums during upload.
* Detect duplicate files using checksums.
* Prevent directory traversal attacks.

---

# Electron Security

Electron should follow current security best practices:

* `contextIsolation: true`
* `nodeIntegration: false`
* `sandbox: true` where supported
* Strict preload bridge
* Validated IPC channels
* Disable remote module
* Disable unnecessary navigation
* Restrict new window creation
* Enforce a Content Security Policy (CSP)

Only explicitly exposed APIs should be available to the renderer process.

---

# API Security

FastAPI endpoints should enforce:

* JWT validation
* Role authorization
* Input validation
* Request size limits
* File upload restrictions
* Structured error handling

Long-running processing jobs should use internally generated job identifiers rather than exposing filesystem paths.

---

# AI Security

AI assistance must never replace deterministic accounting logic.

AI is permitted to:

* Classify documents
* Summarize content
* Explain results
* Suggest reconciliations
* Highlight anomalies
* Draft reports

AI must **not** autonomously:

* Post accounting entries
* Approve reconciliations
* Finalize audit opinions
* Modify financial records without explicit user confirmation

Every AI-generated recommendation should be reviewable and traceable.

---

# Data Privacy

Primary objective:

**Client financial data never leaves the user's computer unless the user explicitly exports or shares it.**

By default:

* No cloud uploads
* No telemetry containing client documents
* No external OCR services
* No automatic synchronization

Future cloud integrations must be opt-in and clearly disclosed.

---

# Audit Logging

The system should record security-relevant events such as:

* Login
* Logout
* Failed authentication
* Password changes
* User creation
* Permission changes
* Document deletion
* Backup creation
* Restore operations
* Report generation
* AI workflow execution
* Reconciliation completion

Audit logs should be append-only where practical.

---

# Backup Security

Backups should include:

* SQLite databases
* User settings
* Client metadata
* Application configuration

Optional future enhancements:

* Password-protected backups
* AES-256 encrypted archives
* Backup verification before restore
* Incremental backups

---

# Local AI Security

When using local LLMs (e.g., Ollama):

* Models execute entirely on the local machine.
* Prompts remain local unless a cloud provider is explicitly selected.
* AI cache and embeddings should be stored separately from operational databases.
* Users should be able to clear AI history and caches.

For cloud AI providers (future):

* Explicit user consent
* Clear indication of external processing
* Configurable provider selection
* Ability to disable cloud AI completely

---

# Integrity & Reliability

To protect against accidental corruption:

* Atomic database transactions
* WAL mode for SQLite where appropriate
* File checksum validation
* Automatic recovery after interrupted processing
* Backup reminders
* Health diagnostics during startup

---

# Compliance Considerations

The platform is designed to support:

* ICAI confidentiality expectations
* Indian accounting practices
* Sensitive financial record handling
* Internal audit requirements

Enterprise deployments may additionally require alignment with organizational information security policies and applicable data protection regulations.

---

# Security Roadmap

## Current

* Offline-first architecture
* bcrypt password hashing
* JWT authentication
* Session persistence
* Role-based permissions
* Prepared SQL statements
* Local-only processing
* Secure Electron IPC

## Near Term

* Database encryption at rest
* Password-protected backups
* Enhanced audit logging
* Digital file integrity verification
* Device-aware session management
* Secure automatic updates

## Future

* Hardware-backed key storage where available
* Optional multi-factor authentication
* Enterprise identity provider integration (e.g., LDAP/SAML/OIDC)
* Certificate-based plugin signing
* Fine-grained permissions
* Encrypted cloud synchronization with end-to-end encryption

---

# Security Design Principles

* Security controls should be enforced by the backend, not just the UI.
* Deterministic accounting operations take precedence over AI-generated suggestions.
* Every sensitive action should be attributable to a user and timestamp.
* Privacy is the default configuration, not an optional feature.
* New modules must inherit the platform's security model rather than implementing independent authentication or authorization mechanisms.
