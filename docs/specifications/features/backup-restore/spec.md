# Feature: Backup and Restore Hub

## 1. Overview

### Purpose
Provide a graphical interface for MongoDB data backup (dump) and recovery (restore) operations powered by official `mongodump` and `mongorestore` tools, supporting compressed archives, selective collection targeting, query-filtered dumps, and scheduled automated backups.

### Background
Data backup and disaster recovery operations are critical responsibilities for database management. While `mongodump` and `mongorestore` provide command-line flexibility, configuring complex parameters (such as gzip compression, archive aggregation, query filters, namespace inclusions, and drop-collection safety flags) often leads to syntax mistakes. A visual interface reduces operational errors and provides continuous progress visibility.

### Status
Ready for Implementation

## 2. Scope

### In Scope
- **Backup (Dump)**:
  - Scope selection: Entire cluster, specific database, or selected collections.
  - Automatic archive packaging (`--archive`) with Gzip compression (`--gzip`).
  - Query filtering: Backing up only documents matching a specific JSON filter.
  - Automatic timestamped output filename generation (`backup_dbname_YYYYMMDD_HHmmss.dump.gz`).
  - Real-time progress monitoring (documents dumped, byte count, throughput).
- **Restore**:
  - Source archive validation and metadata inspection prior to restoration.
  - Selective restoration by namespace (`--nsInclude`).
  - Target overwrite controls (`--drop`).
  - Error tolerance options (`--stopOnError`).
- **Scheduled Backups**:
  - Daily or weekly automated backup jobs saving archives to a specified local directory.

### Out of Scope
- Direct streaming of backup archives to remote cloud buckets (S3/GCS) in the initial milestone (local filesystem targets only).

## 3. Actors and Permissions
- **Actor:** Database Administrator / DevOps Engineer / Developer.
- **Permissions:** Read permissions on target databases for dumps; write permissions for restores.
- **Restrictions:** Executing a restore with `--drop` on a `Production` environment requires Production Guard confirmation.

## 4. Functional Requirements

### FR-BKP-001: Visual Backup Configuration and Execution
- **Description:** Configures and executes database dump operations via `mongodump`, verifying tool availability on disk prior to execution.
- **Preconditions:** Active connection established.
- **Expected Behavior:** Verifies presence of `mongodump` via `ensure_tool_ready("mongodump")`. If missing initially or deleted from disk, automatically triggers on-demand background provisioning of `mongodb-database-tools`. Collects backup parameters (Database, Collections, Output Path, Compression, Query Filter). Spawns `mongodump` subprocess with parameterized arguments. Streams progress events to the frontend.
- **Failure Behavior:** If the tool download fails or the subprocess exits with non-zero status code, capture diagnostic error output and present a formatted notification.
- **Acceptance Criteria:**
  - AC-BKP-01: Verifies and lazily provisions `mongodump` on demand when opening or running backup.
  - AC-BKP-02: Generates valid `.dump.gz` archive files at the specified output path.
  - AC-BKP-03: Emits real-time progress updates displaying document counts and byte transfer rate.
  - AC-BKP-04: Restricts backup scope to specified query filters when provided.

### FR-BKP-002: Restore Inspection and Execution
- **Description:** Previews and restores data from an archive file into a target database via `mongorestore`, verifying tool availability on disk prior to execution.
- **Preconditions:** Archive file exists and active connection established.
- **Expected Behavior:** Verifies presence of `mongorestore` via `ensure_tool_ready("mongorestore")`. If missing or deleted from disk, automatically triggers on-demand provisioning of `mongodb-database-tools`. Interrogates the archive header to list contained databases and collections. User selects target namespace, `--drop` preference, and error handling policy. Spawns `mongorestore` subprocess and updates the UI progress bar.
- **Failure Behavior:** Abort restoration and display error details if the archive is corrupted or inaccessible.
- **Acceptance Criteria:**
  - AC-BKP-05: Verifies and lazily provisions `mongorestore` on demand when opening or running restore.
  - AC-BKP-06: Displays preview of databases and collections stored in the archive before execution.
  - AC-BKP-07: Drops existing collections prior to insertion when the `--drop` option is checked.
  - AC-BKP-08: Accurately reflects restored document counts in the completion summary.

### FR-BKP-003: Scheduled Local Backups
- **Description:** Automates periodic execution of configured backup routines.
- **Preconditions:** Active scheduled job saved in application configuration.
- **Expected Behavior:** Background scheduler in the Rust runtime triggers backup jobs at the specified interval (daily at HH:MM or weekly on day X). Emits system notifications upon job completion.
- **Failure Behavior:** If the database host is unreachable at the scheduled execution time, record the failure in the job history log and notify the user.
- **Acceptance Criteria:**
  - AC-BKP-07: Triggers scheduled backup jobs automatically at the configured time.
  - AC-BKP-08: Retains execution history for the last 50 backup runs.

## 5. Business Rules
### BR-BKP-001: Safe Restoration Guard
- Any restore operation targeting a `Production` environment with `--drop` enabled requires explicit Production Guard confirmation (typing the target database name).

### BR-BKP-002: Archive File Integrity
- All backup operations apply `--gzip` compression and package output into a single archive file (`--archive`).

## 6. User & System Flows

### Backup Flow
1. User navigates to the "Backup & Restore" tab and clicks "New Backup".
2. System calls `ensure_tool_ready("mongodump")` to verify binary presence on disk. If absent or deleted, system prompts and downloads `mongodb-database-tools` in the background with progress reporting.
3. User selects target database (`store_db`) and optionally selects specific collections.
4. User selects destination folder (default: `Documents/Mongox/Backups`).
5. User clicks "Start Backup".
6. Backend invokes `mongodump --uri=... --db=store_db --gzip --archive=...`.
7. UI displays progress bar parsing stderr output lines (`done dumping store_db.orders (15000 documents)`).
8. System displays success alert with final archive file size and duration.

### Restore Flow
1. User clicks "Restore Data" and selects a `.dump.gz` file.
2. System calls `ensure_tool_ready("mongorestore")` to verify binary presence on disk, downloading `mongodb-database-tools` if missing.
3. System inspects archive metadata and displays detected collections.
4. User checks `--drop` and clicks "Run Restore".
5. Backend executes `mongorestore` with parameters.
6. UI displays restore progress and notifies user upon completion.

## 7. Data Requirements
- **BackupConfig Entity:**
  - `connection_id`: String (UUID).
  - `database`: String.
  - `collections`: Vec<String>.
  - `query_filter`: Optional String.
  - `output_directory`: String.
  - `archive_filename`: String.
  - `gzip`: Boolean (default: true).
- **ScheduledBackupJob Entity:**
  - `id`: String (UUID).
  - `name`: String.
  - `cron_expression` or `schedule`: String (e.g., `daily:02:00`).
  - `backup_config`: BackupConfig.
  - `last_run`: Optional ISO 8601 Timestamp.
  - `last_status`: Enum (`Success`, `Failed`, `Running`).

## 8. API & Integration
- **Tauri Commands:**
  - `start_backup(config: BackupConfig) -> Result<String, String>`
  - `inspect_archive(file_path: String) -> Result<ArchiveMetadata, String>`
  - `start_restore(config: RestoreConfig) -> Result<String, String>`
  - `list_scheduled_jobs() -> Vec<ScheduledBackupJob>`
  - `save_scheduled_job(job: ScheduledBackupJob) -> Result<(), String>`

## 9. Security & Privacy
- Connection credentials used by `mongodump` and `mongorestore` are passed securely through standard input or internal parameters, avoiding exposure in system process tables (`ps`).

## 10. Edge Cases
- Insufficient disk space on target volume: System interrogates free disk space before initiating dumps.
- Subprocess cancellation: User clicking "Cancel" terminates child process immediately via OS signal `SIGTERM` / `TerminateProcess`.

## 11. Testing Requirements
- Unit tests for command argument construction from `BackupConfig`.
- Integration tests executing backup and restore rounds against test databases.
- Test verifying correct invocation of Production Guard on restore with `--drop`.

## 12. Open Questions and Assumptions
### Confirmed Decisions
- Backups utilize `--gzip` and `--archive` flags.
- Restoration can optionally drop existing collections.

### Assumptions
- Target file system has write permissions for the application process.

### Open Questions
- None.

## 13. Implementation Notes
- Rust backend: `src-tauri/src/backup_service.rs`, `src-tauri/src/process_runner.rs`.
- Frontend: `src/components/BackupRestore/BackupModal.tsx`, `src/components/BackupRestore/RestoreModal.tsx`, `src/components/BackupRestore/BackupJobs.tsx`.

## 14. Related Documents
- [System Architecture Overview](../../architecture/system-overview.md)
- [Auto-Provisioning Specification](../auto-provisioning/spec.md)
- [Connection Manager Specification](../connection-manager/spec.md)
