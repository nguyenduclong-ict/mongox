# Feature: Feature-Triggered On-Demand Auto-Provisioning

## 1. Overview

### Purpose
Provide modular, just-in-time detection, background acquisition, checksum validation, and local configuration for official MongoDB command-line utilities (`mongosh` and `mongodb-database-tools`), downloading individual tool bundles on first feature use or re-downloading them automatically if removed from disk.

### Background
Mongox relies on official MongoDB command-line tools for shell evaluation, backups, restorations, exports, and imports. Rather than forcing a large, upfront download of all tools during initial application startup, Mongox provisions tools lazily when the user accesses the specific feature that requires them, and automatically recovers when binaries are deleted or missing from disk.

### Status
Implemented

## 2. Scope

### In Scope
- Modular bundle separation:
  - **Shell Bundle**: `mongosh` (required by Query Bar and Mongosh Interactive Console).
  - **Database Tools Bundle**: `mongodump`, `mongorestore`, `mongoexport`, `mongoimport` (required by Backup & Restore Hub and Export & Import Wizard).
- Feature-triggered on-demand acquisition:
  - First use of query evaluation checks and provisions `mongosh`.
  - First use of Backup, Restore, Export, or Import checks and provisions `mongodb-database-tools`.
- Continuous disk presence verification and self-healing:
  - Pre-execution filesystem check verifies binary presence on disk.
  - Automatic re-acquisition if binaries are deleted or corrupted.
- Cryptographic SHA-256 validation against official release manifests.
- Extraction to isolated user storage (`%LOCALAPPDATA%\Mongox\bin\` on Windows, `~/.mongox/bin/` on Unix).
- Non-blocking modal and progress reporting during download.

### Out of Scope
- System-wide `PATH` or registry tampering.
- Provisioning of MongoDB Server (`mongod`).

## 3. Actors and Permissions
- **Actor:** Desktop Application User.
- **Permissions:** Read and write permissions to user profile application data.
- **Restrictions:** Elevated administrative permissions are not required.

## 4. Functional Requirements

### FR-PRV-001: Pre-Execution Tool Existence and Disk-Loss Check
- **Description:** Verifies that the specific executable required for a feature exists on disk and is executable before command dispatch.
- **Preconditions:** User triggers a feature requiring an external CLI tool.
- **Expected Behavior:** Query the file system for the target binary path. If the binary exists and passes a basic readiness check, proceed immediately with the feature execution.
- **Failure Behavior:** If the binary is missing initially or was deleted from disk, pause the feature workflow and trigger the on-demand provisioning routine for the corresponding bundle.
- **Acceptance Criteria:**
  - AC-PRV-01: Verifies binary existence on disk immediately prior to running any child process.
  - AC-PRV-02: Detects missing or deleted executables and initiates the provisioning workflow.

### FR-PRV-002: Targeted Bundle Download and Hash Verification
- **Description:** Downloads only the bundle needed by the active feature over secure HTTPS and verifies its cryptographic hash.
- **Preconditions:** Missing or deleted tool bundle identified.
- **Expected Behavior:** Display a targeted download modal (e.g., "Downloading MongoDB Database Tools..."). Stream the platform-specific archive from MongoDB CDN while updating bytes transferred and ETA. Compute and verify SHA-256 hash.
- **Failure Behavior:** If the hash does not match, delete the corrupt archive, report an integrity error, and offer a retry option.
- **Acceptance Criteria:**
  - AC-PRV-03: Downloads only the requested bundle (`mongosh` or `database-tools`).
  - AC-PRV-04: Confirms SHA-256 checksum matches the compiled-in manifest before extraction.

### FR-PRV-003: Extraction, Registration, and Seamless Continuation
- **Description:** Unpacks verified tool archives into local storage and immediately resumes the pending user feature.
- **Preconditions:** Archive hash verification succeeded.
- **Expected Behavior:** Extract executables into `%LOCALAPPDATA%\Mongox\bin\` (Windows) or `~/.mongox/bin/` (Unix). Apply executable permissions on Unix (`chmod +x`). Close download modal and proceed automatically with the user's initial action (backup, restore, export, import, or query).
- **Failure Behavior:** If extraction encounters filesystem errors, display the error and target directory path.
- **Acceptance Criteria:**
  - AC-PRV-05: Unpacks all binaries belonging to the target bundle.
  - AC-PRV-06: Automatically resumes the user's requested operation upon successful extraction.

## 5. Business Rules
### BR-PRV-001: Lazy Bundle Provisioning
- The application downloads external tooling bundles only when a feature requiring that bundle is invoked.

### BR-PRV-002: Disk Loss Self-Healing
- If an existing binary is removed or corrupted on disk, the system re-provisions it on next use without requiring manual user configuration.

## 6. User & System Flows

### Flow 1: First-Time Use of Backup or Restore
1. User clicks "New Backup" in Backup & Restore Hub.
2. System calls `ensure_tool_ready("mongodump")`.
3. System checks disk: `mongodump.exe` is absent.
4. System opens `ToolProvisioningModal` stating: "Preparing Database Tools (mongodump, mongorestore)..."
5. Backend downloads `mongodb-database-tools` archive over HTTPS and displays download progress.
6. Backend verifies SHA-256 hash and extracts archive to local `%LOCALAPPDATA%\Mongox\bin\`.
7. Modal closes and the Backup configuration dialog immediately opens for the user.

### Flow 2: Subsequent Use (Tool Already on Disk)
1. User clicks "Export" on a collection.
2. System calls `ensure_tool_ready("mongoexport")`.
3. System checks disk: `mongoexport.exe` is present and validated.
4. Export configuration dialog opens immediately without modal or network delay.

### Flow 3: Recovering from Deleted / Missing Binaries
1. An external cleanup tool deletes the `%LOCALAPPDATA%\Mongox\bin\` folder.
2. User clicks "Run Query" or "Import".
3. System checks disk: binary missing.
4. System automatically triggers the on-demand download for the missing bundle, restoring functionality.

## 7. Data Requirements
- **ToolBundle Enum:** `Shell` (`mongosh`), `DatabaseTools` (`mongodump`, `mongorestore`, `mongoexport`, `mongoimport`).
- **ToolStatus Entity:**
  - `bundle`: ToolBundle.
  - `status`: Enum (`Ready`, `Missing`, `Downloading`, `Extracting`, `Failed`).
  - `binary_path`: Optional String.
  - `progress_percent`: Float.
  - `downloaded_bytes`: Integer.
  - `total_bytes`: Integer.
  - `speed_bps`: Integer.

## 8. API & Integration
- **Tauri Commands:**
  - `ensure_tool_ready(tool_name: String) -> Result<String, String>`
  - `get_installed_tools() -> HashMap<String, bool>`
  - `cancel_provisioning(bundle: String) -> Result<(), String>`
- **Events:**
  - `provisioning://progress` (payload: `DownloadProgress`)
  - `provisioning://complete` (payload: `ToolBundle`)

## 9. Security & Privacy
- Binaries are downloaded exclusively from official MongoDB CDN domains over HTTPS.
- Strict SHA-256 validation prevents execution of tampered binaries.

## 10. Edge Cases
- Network disconnection during on-demand download: The active modal displays a "Retry Download" button and preserves user input form data.
- User cancels download modal: Aborts download subprocess and returns user to previous view without executing the command.

## 11. Testing Requirements
- Unit test for pre-execution disk check logic (`Path::exists` and executable flag).
- Integration test for self-healing: simulate binary file deletion and verify automatic re-download trigger.
- Hash comparison unit tests for both `mongosh` and `database-tools` archive bundles.

## 12. Open Questions and Assumptions
### Confirmed Decisions
- Tool provisioning is lazy and triggered per bundle on feature access.
- Missing or deleted disk binaries are automatically detected and re-provisioned.

### Assumptions
- Internet connectivity is active during first-time feature invocation when binaries are not yet cached.

### Open Questions
- None.

## 13. Implementation Notes
- Rust module: `src-tauri/src/provisioner.rs`.
- Frontend component: `src/components/ProvisioningModal.tsx`.

## 14. Related Documents
- [System Architecture Overview](../../architecture/system-overview.md)
- [ADR-0002: Zero-Setup Auto-Provisioning](../../architecture/decisions/0002-zero-setup-auto-provisioning.md)
- [Backup and Restore Specification](../backup-restore/spec.md)
- [Export and Import Specification](../export-import/spec.md)
