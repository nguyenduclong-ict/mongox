# System Architecture Overview

This document describes the high-level architecture of Mongox, detailing the core components, runtime boundaries, process execution model, and inter-process communication (IPC) contracts.

## 1. High-Level Architectural Model

Mongox operates as a hybrid desktop application combining a high-performance native Rust core powered by **Tauri v2** with a modern **React 19** frontend.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Mongox Desktop Window                           │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                     Frontend (Webview)                         │   │
│   │                                                                │   │
│   │  React 19 + TypeScript + Tailwind CSS                          │   │
│   │  ├── UI Components (Sidebar, QueryBar, Views, Modals)          │   │
│   │  ├── State & Hooks (useConnection, useProvisioning)            │   │
│   │  └── Services (Tauri IPC Wrapper)                              │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│                         IPC Bridge (tauri://invoke)                    │
│                                   │                                    │
│   ┌───────────────────────────────▼────────────────────────────────┐   │
│   │                  Backend Runtime (Rust Core)                   │   │
│   │                                                                │   │
│   │  Tauri v2 / Tokio Async Runtime                                │   │
│   │  ├── Commands & Routing (`lib.rs`)                             │   │
│   │  ├── Provisioner Service (`provisioner.rs`)                    │   │
│   │  ├── Process Runner & Stream Manager (`process_runner.rs`)     │   │
│   │  ├── Connection & Credential Manager (`connection.rs`)         │   │
│   │  ├── Backup & Restore Service (`backup_service.rs`)            │   │
│   │  └── OS Credential Vault (Keyring / Security API)              │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │
                       Managed Child Subprocesses
                                    │
            ┌───────────────────────┴───────────────────────┐
            │                                               │
            ▼                                               ▼
┌────────────────────────┐                     ┌────────────────────────┐
│        mongosh         │                     │ mongodb-database-tools │
│ (Query & JavaScript)   │                     │ (dump, restore, export)│
└────────────────────────┘                     └────────────────────────┘
```

## 2. Core Backend Modules (Rust Core)

The backend is built with Rust and resides in `src-tauri/`. It manages system-level privileges, process spawning, network communication, and credential persistence.

### 2.1. Provisioner Service (`provisioner.rs`)
- Manages on-demand detection, acquisition, and verification of modular tool binaries:
  - `mongosh`: Provisioned upon invoking queries or the interactive console.
  - `mongodb-database-tools` (`mongodump`, `mongorestore`, `mongoexport`, `mongoimport`): Provisioned upon first opening or executing Backup, Restore, Export, or Import features.
- Implements an `ensure_tool_ready(tool_kind)` workflow:
  - First checks active system `PATH` and internal storage (`%LOCALAPPDATA%\Mongox\bin\` on Windows).
  - Confirms file existence and executable readiness on disk prior to every subprocess launch.
  - If missing (first-time feature usage) or removed/lost from disk, signals the frontend to display an on-demand progress modal and initiates background download from MongoDB CDN.
  - Verifies SHA-256 cryptographic hashes against embedded release manifests before extraction.
  - Registers resolved executable paths for immediate subprocess execution upon download completion.

### 2.2. Process Runner (`process_runner.rs`)
- Manages the lifecycle of CLI child processes.
- Invokes commands using strict parameterized string arrays (avoiding shell execution strings).
- Streams standard output (`stdout`) and standard error (`stderr`) via asynchronous Tokio channels.
- Emits real-time progress events to the frontend via Tauri event listeners.

### 2.3. Connection & Credential Service (`connection.rs`)
- Persists user connection profiles (cluster name, host, port, username, authentication database, TLS settings).
- Stores plaintext credentials and connection strings within the OS native secure store (Windows Credential Manager, macOS Keychain, Linux Secret Service).
- Dispatches ping requests to measure connection latency.

### 2.4. Backup & Restore Service (`backup_service.rs`)
- Translates user-configured options into parameterized arguments for `mongodump` and `mongorestore`.
- Employs gzip compression (`--gzip`) and single archive files (`--archive`) for atomic and portable backups.
- Tracks and reports active backup jobs, remaining transfer estimates, and error codes.

## 3. Frontend Architecture (React 19)

The frontend resides in `src/` and renders inside the native system webview (WebView2 on Windows, WebKit on macOS, WebKitGTK on Linux).

### 3.1. State Management & Hooks
- `useConnection`: Tracks active cluster profile, database selection, collection lists, and real-time latency state.
- `useProvisioning`: Monitors the initialization and download status of the CLI engine.

### 3.2. View Layers
- **Document Explorer**: Displays collection records across three synchronized views:
  - Table View (flattened columns with BSON type chips).
  - Tree View (interactive collapsible JSON hierarchy).
  - Raw JSON View (Monaco / CodeMirror editor with formatting).
- **Command Palette (`Ctrl + K`)**: Provides keyboard-first navigation across all tabs, collections, and tools.
- **Visual Aggregation Builder**: Multi-stage pipeline construction with immediate data previews.
- **Mongosh Console**: Interactive terminal emulator sending commands to the background `mongosh` subprocess.

## 4. Subprocess Execution Strategy

To ensure fidelity with MongoDB standards, Mongox relies on official binaries rather than reimplementing proprietary database protocol drivers for complex management tasks.

1. **Query & CRUD Operations**: Handled via structured `mongosh --json=relaxed --eval` calls with output streamed and parsed into typed JSON documents.
2. **Bulk Data Movement**: Handled via `mongodump`, `mongorestore`, `mongoexport`, and `mongoimport` child processes with buffered pipe readers tracking progress lines.
3. **Security Boundary**: All process invocations execute with the user's local operating system permissions. Input arguments are sanitized and passed as distinct array elements.

## 5. Related Documents

- [ADR-0001: Tauri v2 Framework Selection](./decisions/0001-tauri-v2-architecture.md)
- [ADR-0002: Zero-Setup Auto-Provisioning Engine](./decisions/0002-zero-setup-auto-provisioning.md)
- [Engineering Guidelines](../engineering/guidelines.md)
- [Security Guidelines](../engineering/security.md)
