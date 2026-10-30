# Feature: Export and Import Wizard with Smart Data Masking

## 1. Overview

### Purpose
Provide a wizard-driven workflow for importing and exporting MongoDB data across JSON, CSV, and NDJSON formats, featuring data preview, schema auto-mapping, duplicate record resolution strategies, and automated data masking for sensitive fields.

### Background
Developers and data teams routinely migrate data between environments, generate test fixtures, and export datasets for reporting. Exporting raw production data risks exposing Personally Identifiable Information (PII). Importing external datasets requires manual verification of schema alignments and duplicate resolution policies. The Export and Import Wizard addresses both needs with an intuitive interface.

### Status
Ready for Implementation

## 2. Scope

### In Scope
- **Export Capabilities**:
  - Format support: JSON (formatted or minified array), CSV (comma-delimited), NDJSON (Newline-Delimited JSON).
  - Selective field targeting (include or exclude specific top-level and nested properties).
  - Date format conversion and ObjectId serialization options.
  - Smart Data Masking: Pattern-based obfuscation rules for email addresses, phone numbers, national IDs, and credentials.
  - Query filtering: Exporting subsets of data matching specific filter criteria.
- **Import Capabilities**:
  - Format ingestion: JSON, CSV, and NDJSON files.
  - Preview of initial 10 records before full ingestion.
  - Automatic column and data type detection (Schema Auto-Mapping).
  - Conflict resolution modes: Upsert (replace matching `_id`), Skip (ignore duplicates), and Stop on Error.
  - Real-time ingestion metrics (records processed, errors encountered).

### Out of Scope
- Direct binary database dumps (covered by the Backup and Restore Hub).
- Direct Excel (`.xlsx`) parsing (handled via CSV conversion).

## 3. Actors and Permissions
- **Actor:** Developer / QA Engineer / Data Analyst.
- **Permissions:** Read access for exports; write access for imports.
- **Restrictions:** Bulk import into `Production` environments requires Production Guard confirmation.

## 4. Functional Requirements

### FR-EXP-001: Data Export Configuration
- **Description:** Configures and executes data export from selected collections into JSON, CSV, or NDJSON, verifying tool availability on disk prior to execution.
- **Preconditions:** Collection selected and active connection established.
- **Expected Behavior:** Verifies presence of `mongoexport` via `ensure_tool_ready("mongoexport")`. If absent or deleted from disk, automatically triggers on-demand background provisioning of `mongodb-database-tools`. Accepts user parameters (target fields, format, query filter, output destination). Spawns export process, formats output, and writes to disk.
- **Failure Behavior:** If the tool download fails, query filter is malformed, or write access is restricted, report diagnostic error details in the wizard dialog.
- **Acceptance Criteria:**
  - AC-EXP-01: Verifies and lazily provisions `mongoexport` on demand when opening or running export.
  - AC-EXP-02: Generates valid JSON, CSV, and NDJSON files matching selected field schemas.
  - AC-EXP-03: Applies query filter constraints to exported datasets.

### FR-EXP-002: Smart Data Masking
- **Description:** Obfuscates sensitive fields during export operations according to defined masking rules.
- **Preconditions:** Export configuration active.
- **Expected Behavior:** Apply masking transformations prior to writing records to disk:
  - Email addresses: Mask username leaving initial character and domain intact (e.g., `j***@domain.com`).
  - Phone numbers and national IDs: Obfuscate central digits (e.g., `+1-***-***-8899`).
  - Passwords and secret keys: Replace with SHA-256 hash or empty string.
- **Failure Behavior:** If a field targeted for masking is absent or null in a document, preserve the null state without throwing an error.
- **Acceptance Criteria:**
  - AC-EXP-03: Obfuscates email addresses matching the masking pattern.
  - AC-EXP-04: Hashes or removes designated credential fields.

### FR-EXP-003: Data Import Wizard with Preview
- **Description:** Guides user through importing external data files into a collection, verifying tool availability on disk prior to execution.
- **Preconditions:** Target collection chosen and active connection established.
- **Expected Behavior:** Verifies presence of `mongoimport` via `ensure_tool_ready("mongoimport")`. If absent or deleted from disk, automatically triggers on-demand background provisioning of `mongodb-database-tools`. Read and display the initial 10 records of the selected file in a preview table. Infer column types (String, Number, Date, Boolean, ObjectId). Allow the user to override inferred types.
- **Failure Behavior:** If the tool download fails or the source file contains invalid formatting, display error details and stopped line numbers.
- **Acceptance Criteria:**
  - AC-EXP-06: Verifies and lazily provisions `mongoimport` on demand when opening or running import.
  - AC-EXP-07: Renders 10-record preview table with inferred data types.
  - AC-EXP-08: Allows users to map CSV headers to custom document property names.

### FR-EXP-004: Ingestion Conflict Resolution
- **Description:** Handles duplicate key collisions during import.
- **Preconditions:** Import configuration active.
- **Expected Behavior:** Apply user-selected policy when primary key (`_id`) collisions occur:
  - `Upsert`: Overwrites existing document with imported record.
  - `Skip`: Retains existing document and continues processing remaining records.
  - `Stop on Error`: Halts import and rolls back or reports stopped line number.
- **Failure Behavior:** If errors exceed user-defined threshold, halt import and generate summary log.
- **Acceptance Criteria:**
  - AC-EXP-07: Executes selected conflict resolution policy upon encountering existing keys.
  - AC-EXP-08: Reports total imported count, skipped count, and failed records upon completion.

## 5. Business Rules
### BR-EXP-001: PII Protection Default
- The export interface highlights detected PII field names (e.g., `email`, `phone`, `password`, `ssn`) and recommends data masking.

### BR-EXP-002: Production Guard on Bulk Import
- Initiating an import into a `Production` tagged environment invokes Production Guard confirmation.

## 6. User & System Flows

### Export Flow
1. User clicks "Export" on the active collection view.
2. System calls `ensure_tool_ready("mongoexport")` to verify binary presence on disk. If absent or deleted, system prompts and downloads `mongodb-database-tools` in the background with progress reporting.
3. User selects format: `CSV`.
4. User selects fields to include: `_id`, `name`, `email`, `createdAt`.
5. User enables "Data Masking" on `email`.
6. User selects output path: `exports/customers_masked.csv`.
7. User clicks "Start Export".
8. System processes records, applies masking transforms, and writes output file.
9. System displays completion notification with record count.

### Import Flow
1. User clicks "Import" and chooses a `.ndjson` file.
2. System calls `ensure_tool_ready("mongoimport")` to verify binary presence on disk, downloading `mongodb-database-tools` if missing.
3. System loads file header and displays 10 preview rows in `ImportModal`.
4. User confirms schema mappings and selects duplicate strategy `Upsert`.
5. User clicks "Run Import".
6. Backend invokes `mongoimport` with `--mode=upsert`.
7. Progress bar streams completed rows.
8. Collection view automatically refreshes upon completion.

## 7. Data Requirements
- **ExportConfig Entity:**
  - `collection`: String.
  - `format`: Enum (`JSON`, `CSV`, `NDJSON`).
  - `fields`: Vec<String>.
  - `filter`: Optional String.
  - `masking_rules`: Vec<MaskingRule>.
  - `output_file_path`: String.
- **MaskingRule Entity:**
  - `field_path`: String.
  - `rule_type`: Enum (`MaskEmail`, `MaskPhone`, `HashSha256`, `RedactEmpty`).
- **ImportConfig Entity:**
  - `collection`: String.
  - `file_path`: String.
  - `format`: Enum (`JSON`, `CSV`, `NDJSON`).
  - `conflict_mode`: Enum (`Upsert`, `Skip`, `StopOnError`).
  - `field_mappings`: HashMap<String, String>.

## 8. API & Integration
- **Tauri Commands:**
  - `preview_import_file(path: String, format: String) -> Result<ImportPreview, String>`
  - `start_export(config: ExportConfig) -> Result<ExportSummary, String>`
  - `start_import(config: ImportConfig) -> Result<ImportSummary, String>`

## 9. Security & Privacy
- Masking logic is applied in-memory before writing export files to permanent disk storage.
- Temporary preview buffers are released immediately after modal dismissal.

## 10. Edge Cases
- CSV files containing embedded newline characters inside quoted strings: System uses standard RFC 4180 CSV parser.
- Heterogeneous document structures across JSON array: System aggregates the superset of all unique keys to construct CSV header columns.

## 11. Testing Requirements
- Unit tests verifying masking transformations for diverse email and phone formats.
- Parser tests verifying RFC 4180 CSV delimiter handling.
- Integration tests validating `Upsert` versus `Skip` duplicate handling behavior.

## 12. Open Questions and Assumptions
### Confirmed Decisions
- Supported formats are JSON, CSV, and NDJSON.
- Data masking covers email, phone, ID, and hash redaction.

### Assumptions
- Export datasets fit within available disk storage.

### Open Questions
- None.

## 13. Implementation Notes
- Rust crates: `csv`, `serde_json`, `regex`, `sha2`.
- Frontend: `src/components/ExportImport/ExportModal.tsx`, `src/components/ExportImport/ImportModal.tsx`.

## 14. Related Documents
- [System Architecture Overview](../../architecture/system-overview.md)
- [Document Explorer Specification](../document-explorer/spec.md)
- [Security Guidelines](../../engineering/security.md)
