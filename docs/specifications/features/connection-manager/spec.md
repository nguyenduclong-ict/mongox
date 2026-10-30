# Feature: Connection Manager and Production Guard

## 1. Overview

### Purpose
Enable users to configure, organize, authenticate, and monitor connections to local, remote, and cloud MongoDB deployments, while enforcing safety guardrails on environments designated as Production.

### Background
Developers and database administrators frequently switch between local sandbox databases, shared staging environments, and mission-critical production clusters. Accidentally executing destructive modifications on a production database is a catastrophic failure mode. Mongox provides organized connection profiles and active safeguards.

### Status
Implemented

## 2. Scope

### In Scope
- Management of connection profiles (create, edit, duplicate, delete, search).
- Support for standard URIs (`mongodb://`), DNS seedlists (`mongodb+srv://`), replica sets, and sharded clusters.
- Authentication mechanisms: SCRAM-SHA-1, SCRAM-SHA-256, X.509, and TLS/SSL certificate attachments.
- Environment categorization: `Local`, `Development`, `Staging`, `Production`.
- Real-time connection latency measurement and health status badges.
- Production Guard: Multi-step confirmation requirement for destructive commands on production environments.
- Secure credential persistence using the host operating system credential vault.

### Out of Scope
- Direct hosting or deployment of remote MongoDB instances.
- SSH multi-hop dynamic port tunneling (single SSH tunnel support is planned for future iterations).

## 3. Actors and Permissions
- **Actor:** Database Administrator / Developer.
- **Permissions:** Full access to manage local connection profiles.
- **Restrictions:** Destructive actions on `Production` connections require explicit interactive confirmation.

## 4. Functional Requirements

### FR-CON-001: Connection Profile Management
- **Description:** Users can create, update, clone, and remove saved connection profiles.
- **Preconditions:** Application is in a ready operational state.
- **Expected Behavior:** Persist connection metadata (label, host, port, username, authentication database, TLS options, environment tag). Store sensitive passwords in the OS credential vault.
- **Failure Behavior:** If required connection fields are missing or invalid, display inline validation errors.
- **Acceptance Criteria:**
  - AC-CON-01: Saves valid connection profile and updates the sidebar connection list.
  - AC-CON-02: Obfuscates passwords in UI inputs and retrieves secrets securely from the OS keyring.

### FR-CON-002: Connection Verification and Latency Measurement
- **Description:** Verifies connectivity to the target database and reports round-trip latency.
- **Preconditions:** Connection parameters populated.
- **Expected Behavior:** Executes an administrative ping (`db.runCommand({ ping: 1 })`) via `mongosh`. Calculate round-trip time in milliseconds and display badge (`● 14ms`).
- **Failure Behavior:** Display an error dialog containing MongoDB server error code and diagnostic text when the connection fails.
- **Acceptance Criteria:**
  - AC-CON-03: Displays round-trip latency for reachable hosts.
  - AC-CON-04: Details authentication failure reasons (e.g., bad credentials, network timeout, TLS handshake failure).

### FR-CON-003: Production Guard Protection
- **Description:** Enforces confirmation protocols when destructive operations are targeted at an environment tagged as `Production`.
- **Preconditions:** Current connection tagged as `Production`. User triggers a destructive command (Drop Database, Drop Collection, Delete Many, Update Many).
- **Expected Behavior:** Display a modal dialog with a red warning badge. Require the user to type the exact name of the targeted database or collection before unlocking the confirm button.
- **Failure Behavior:** Prevent execution of the action if the typed input fails to match the target identifier exactly.
- **Acceptance Criteria:**
  - AC-CON-05: Blocks one-click drop or bulk delete operations in Production mode.
  - AC-CON-06: Unlocks the confirmation action only when the user types the exact matching entity name.

## 5. Business Rules
### BR-CON-001: Credential Protection
- Connection passwords and authorization keys are stored exclusively in the host operating system secure vault (Windows Credential Manager, macOS Keychain, Linux Secret Service).

### BR-CON-002: Production Isolation
- Connections tagged as `Production` display distinctive red accent badges across the header, breadcrumbs, and sidebar.

## 6. User & System Flows

### Main Flow: Adding and Connecting to a Cluster
1. User clicks "New Connection" in the sidebar or presses `Ctrl + N`.
2. User enters connection URI or fills structured fields (Host, Port, Auth, TLS, Environment).
3. User clicks "Test Connection".
4. Rust backend executes test ping and returns success with latency.
5. User clicks "Save & Connect".
6. Sidebar refreshes with database and collection hierarchy.

### Destructive Flow: Dropping a Production Collection
1. User right-clicks a collection in a `Production` environment and selects "Drop Collection".
2. System detects `Production` environment tag and opens `ProductionGuardModal`.
3. Modal displays entity details and prompts: "Type 'orders' to confirm deletion".
4. User inputs the name and clicks "Permanently Drop".
5. Backend issues drop command and refreshes the schema tree.

## 7. Data Requirements
- **ConnectionProfile Entity:**
  - `id`: UUID string.
  - `name`: String.
  - `uri`: Sanitized connection string (passwords replaced by vault key references).
  - `environment`: Enum (`Local`, `Development`, `Staging`, `Production`).
  - `tls_enabled`: Boolean.
  - `ca_file_path`: Optional String.
  - `created_at`: ISO 8601 Timestamp.
  - `updated_at`: ISO 8601 Timestamp.

## 8. API & Integration
- **Tauri Commands:**
  - `list_connections() -> Vec<ConnectionProfile>`
  - `save_connection(profile: ConnectionProfile, secret: Option<String>) -> Result<ConnectionProfile, String>`
  - `delete_connection(id: String) -> Result<(), String>`
  - `test_connection(profile: ConnectionProfile, secret: Option<String>) -> Result<PingResult, String>`
  - `connect_cluster(id: String) -> Result<ClusterOverview, String>`

## 9. Security & Privacy
- Sensitive credentials never touch unencrypted local files.
- Connection strings presented in logs or UI headers are sanitized with redacted passwords (`mongodb://user:***@host`).

## 10. Edge Cases
- Expired TLS certificates: System extracts and displays certificate validity dates on failure.
- DNS resolution failures for `mongodb+srv://` links: System prompts user to check DNS settings or switch to standard seedlist format.

## 11. Testing Requirements
- Unit tests for URI parsing and sanitization functions.
- Mock tests for OS keyring read and write actions.
- UI component tests for `ProductionGuardModal` input validation matching.

## 12. Open Questions and Assumptions
### Confirmed Decisions
- Connection passwords are kept in native OS keyrings.
- Production confirmation requires typing the target entity name.

### Assumptions
- The host OS provides a functional keyring service.

### Open Questions
- None.

## 13. Implementation Notes
- Rust crates: `keyring`, `url`, `tokio`.
- Files: `src-tauri/src/connection.rs`, `src/components/ConnectionModal.tsx`, `src/hooks/useConnection.ts`.

## 14. Related Documents
- [System Architecture Overview](../../architecture/system-overview.md)
- [Security Guidelines](../../engineering/security.md)
- [Product Requirements](../../product/requirements.md)
