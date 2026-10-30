# System-Wide Product Requirements

This document specifies the top-level functional and non-functional requirements for Mongox.

## 1. Functional Requirements

### FR-001: Feature-Triggered On-Demand Engine Provisioning
- The system checks local standard directories, `PATH`, and local application storage for official MongoDB CLI tools (`mongosh`, `mongodump`, `mongorestore`, `mongoexport`, `mongoimport`).
- Provisioning operates lazily on demand:
  - Database tools (`mongodump`, `mongorestore`, `mongoexport`, `mongoimport`) are verified and downloaded upon the user's initial invocation of Backup, Restore, Export, or Import features.
  - Shell tools (`mongosh`) are verified and downloaded upon query execution or interactive console launch.
- If a binary is missing initially or subsequently removed/lost from disk, the system detects the absence and triggers on-demand re-download and integrity verification.
- Downloaded archives are verified with SHA-256 checksums and unpacked into user-local application storage (`%LOCALAPPDATA%\Mongox\bin\` on Windows, `~/.mongox/bin/` on Unix).

### FR-002: Connection Management
- The system supports connection URI formats: standard connection strings (`mongodb://`), DNS seedlists (`mongodb+srv://`), replica sets, and sharded clusters.
- The system provides environment classification tagging: `Local`, `Development`, `Staging`, `Production`.
- Connection credentials and secret URIs are stored in the operating system secure credential vault.
- The system performs periodic latency checks and displays real-time connection status badges.

### FR-003: Production Safeguard Guardrails
- Critical operations (such as collection drop, database drop, bulk delete, bulk update) on environments marked as `Production` require explicit manual two-step confirmation, requiring the user to type the target collection or database name.

### FR-004: Document Exploration and Querying
- The system provides a query editor supporting BSON/JSON filters, sort criteria, projections, limits, and pagination skips.
- The system provides three interchangeable data inspection views: Table View, Interactive Tree View, and Raw JSON View.
- Users can insert, edit, copy, duplicate, and delete documents with pre-save schema and JSON validation.

### FR-005: Backup and Restore Operations
- The system executes backup routines using `mongodump` with gzip compression and single-archive packaging.
- The system provides restoration routines using `mongorestore` with preview inspection, drop-collection options, and namespace filtering.
- Users can configure scheduled backup jobs targeting specified local directories.

### FR-006: Data Export, Import, and Masking
- The system supports data interchange in JSON, CSV, and NDJSON (Newline-Delimited JSON) formats.
- The import wizard provides automatic schema mapping and a preview of the initial records.
- The export engine provides rule-based PII anonymization (masking emails, phone numbers, identification numbers, and credentials).

### FR-007: Visual Aggregation Pipeline Builder
- The system enables stage-by-stage pipeline composition with real-time preview of intermediate data transformations.
- The system measures and displays execution latency per stage.
- Pipelines can be exported to multiple target programming languages (JavaScript/mongosh, Python, Rust, Go, C#).

### FR-008: Index Inspection and Profiling
- The system lists all collection indexes alongside memory and storage statistics.
- The system allows index creation for single-field, compound, text, TTL, and geospatial indexes.
- The system visualizes MongoDB `explain("executionStats")` plans, highlighting query bottlenecks and full collection scans (`COLLSCAN`).

### FR-009: Interactive Mongosh Console
- The system embeds an interactive JavaScript shell session powered by the background `mongosh` engine.
- The console supports command history navigation, syntax highlighting, and execution timing output.

### FR-010: Real-Time Server Telemetry
- The system displays real-time cluster metrics including active connections, operations per second (Insert, Query, Update, Delete), network throughput, and memory consumption.

## 2. Non-Functional Requirements

### NFR-001: Performance and Startup
- Initial cold application launch completes within 1.5 seconds on baseline modern hardware.
- Memory consumption during idle operations remains below 150 MB RSS.

### NFR-002: Security
- Clear-text passwords and sensitive connection parameters are stored in the OS credential store (Windows Credential Manager, macOS Keychain, Linux Secret Service).
- External command invocation strictly uses parameterized argument arrays to prevent command injection.

### NFR-003: Platform Support
- The application natively targets Windows 10/11 (x64, arm64), macOS (Apple Silicon, Intel), and modern Linux distributions (AppImage, deb, rpm).

## 3. Related Documents

- [Product Overview](./overview.md)
- [Domain Glossary](./glossary.md)
- [System Architecture Overview](../architecture/system-overview.md)
