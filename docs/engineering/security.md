# Security Guidelines and Best Practices

This document outlines the security architecture, threat model mitigations, and defensive programming standards implemented in Mongox.

## 1. Threat Model and Defense Strategy

As a desktop application managing remote database credentials and executing local command-line tools, Mongox prioritizes three critical security domains:
1. Protection of stored credentials and secret connection URIs.
2. Prevention of command injection and unauthorized subprocess execution.
3. Guarding against accidental destructive operations on production environments.

## 2. Subprocess Security & Parameter Isolation

### 2.1. Parameter Array Invocation
Mongox spawns external executables (`mongosh`, `mongodump`, `mongorestore`, `mongoexport`, `mongoimport`) via Rust's `tokio::process::Command` API using isolated argument arrays.

- All arguments, flags, and options are passed as individual array elements (`.arg(...)`).
- Shell string interpolation (such as passing formatted strings to `cmd.exe /C` or `sh -c`) is strictly prohibited. This eliminates command injection vectors when handling user-supplied query filters, collection names, or connection strings.

### 2.2. Executable Verification
- Executables are resolved from trusted system locations or from the application-controlled local directory (`%LOCALAPPDATA%\Mongox\bin\` on Windows).
- During auto-provisioning, downloaded archives undergo SHA-256 validation against trusted release hashes prior to extraction and execution.

## 3. Credential and Secret Management

### 3.1. OS Keyring Integration
- Plaintext database passwords, authentication keys, and sensitive connection strings are stored in the host operating system's native credential store:
  - Windows: Windows Credential Manager.
  - macOS: Apple Keychain Services.
  - Linux: Secret Service API (via `libsecret` / FreeDesktop Secret Service).
- Application configuration files saved on disk store only non-sensitive metadata (connection labels, hosts, ports, usernames, and vault reference keys).

### 3.2. Connection String Sanitization
- In logs, breadcrumbs, UI headers, and error reports, connection URIs are scrubbed of credentials:
  ```text
  mongodb://admin:secret123@cluster0.example.com/db
  -> mongodb://admin:***@cluster0.example.com/db
  ```

## 4. Production Safeguards (Production Guard)

To eliminate accidental administrative data destruction:
- Connections assigned the `Production` environment tag enforce strict confirmation gates.
- Destructive operations (`dropDatabase`, `dropCollection`, bulk deletions, bulk updates, restore with `--drop`) require the user to confirm intent by typing the exact entity name into a dedicated confirmation prompt.
- Production connections feature high-visibility visual indicators across the UI (red badges and border accents) to maintain user situational awareness.

## 5. File System and Network Security

- **HTTPS Enforced**: All binary engine downloads communicate strictly over TLS/HTTPS with official MongoDB distribution domains.
- **Local Isolation**: Extracted binaries and temporary files are scoped to the current user's profile storage, preventing modification by unprivileged users on multi-tenant workstations.

## 6. Related Documents

- [System Architecture Overview](../architecture/system-overview.md)
- [Auto-Provisioning Specification](../specifications/features/auto-provisioning/spec.md)
- [Connection Manager Specification](../specifications/features/connection-manager/spec.md)
