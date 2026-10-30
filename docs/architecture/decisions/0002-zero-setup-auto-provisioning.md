# ADR-0002: Zero-Setup Auto-Provisioning of Official MongoDB CLI Tooling

## Status
Accepted

## Context
A major barrier for developers and administrators using MongoDB management clients is the prerequisite installation and configuration of auxiliary command-line tools (`mongosh` for scripting and evaluation, `mongodump` and `mongorestore` for backup/restore, and `mongoexport`/`mongoimport` for data transfer). Users frequently encounter path configuration errors, version mismatches, and broken environment variables.

Additionally, embedding all binaries directly into the desktop installer increases the installer size significantly across every supported platform and architecture.

## Decision
We implement a **Feature-Triggered On-Demand (Just-in-Time) Auto-Provisioning Engine** in the Rust backend (`provisioner.rs`).

1. **Decoupled Tool Bundles**:
   - Shell Engine: `mongosh` bundle (utilized for query evaluation and interactive console).
   - Database Tools: `mongodb-database-tools` bundle containing `mongodump`, `mongorestore`, `mongoexport`, and `mongoimport` (utilized for backup, restore, export, and import features).
2. **Feature-Triggered Just-in-Time Provisioning**:
   - Tools are verified and acquired at the moment the user initiates the corresponding feature.
   - Accessing Backup or Restore triggers verification for `mongodump` and `mongorestore`.
   - Accessing Export or Import triggers verification for `mongoexport` and `mongoimport`.
   - Executing queries or opening the console triggers verification for `mongosh`.
3. **Continuous Disk Presence Verification & Self-Healing**:
   - Each operation performs an immediate filesystem existence check (`Path::is_file()`).
   - If a binary is missing, corrupted, or deleted by external processes, the application prompts and initiates on-demand re-download and integrity verification without requiring application reinstallation.
4. **Integrity Verification & Local Isolation**:
   - Archives are downloaded over HTTPS from MongoDB's official CDN.
   - SHA-256 checksums are validated against compiled-in release manifests before extraction.
   - Binaries are stored in user-isolated directories (`%LOCALAPPDATA%\Mongox\bin\` on Windows, `~/.mongox/bin/` on Unix).

## Alternatives Considered

- **Bundling All Binaries in the Installer**:
  - *Strengths*: Tools are available immediately upon installation without requiring internet access.
  - *Trade-offs*: Bloats installer size by over 100MB per target architecture; prevents independent binary updates when MongoDB releases patches.

- **Requiring Manual User Installation**:
  - *Strengths*: Simple application implementation without binary download logic.
  - *Trade-offs*: Poor onboarding experience; requires manual PATH configuration and troubleshooting for non-technical users.

- **Custom Native Driver Implementation**:
  - *Strengths*: Complete control over network protocol without external executables.
  - *Trade-offs*: Massive engineering overhead reimplementing aggregation parsers, BSON dump archive formats, and shell evaluation semantics; high ongoing maintenance risk.

## Consequences

### Positive
- The installer remains compact and fast to download.
- Users achieve a seamless first-run experience without manual command-line installation.
- Security is maintained through strict SHA-256 validation.
- Centralized subprocess invocation ensures stable executable paths.

### Negative / Trade-offs
- First-time launch requires internet connectivity to fetch missing binaries.
- The Rust backend must manage archive extraction (`zip`, `tar.gz`) and download progress reporting via IPC events.

## Related Documents
- [System Architecture Overview](../system-overview.md)
- [Auto-Provisioning Feature Specification](../../specifications/features/auto-provisioning/spec.md)
- [Security Guidelines](../../engineering/security.md)
