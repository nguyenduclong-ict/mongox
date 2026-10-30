export type ToolBundle = "shell" | "databasetools";

export interface ToolStatus {
  name: string;
  bundle: ToolBundle;
  is_available: boolean;
  path: string | null;
  source: string | null; // "local_bin" | "system_path"
}

export interface DownloadProgress {
  bundle: ToolBundle;
  stage: "downloading" | "verifying" | "extracting" | "ready" | "failed";
  downloaded_bytes: number;
  total_bytes: number;
  progress_percent: number;
  speed_bytes_per_sec: number;
  message: string;
}

// ==========================================
// Connection Manager Types
// ==========================================

export type Environment = "local" | "development" | "staging" | "production";

export interface ConnectionProfile {
  id: string;
  name: string;
  uri: string;
  environment: Environment;
  created_at: string;
  updated_at: string;
}

export interface PingResult {
  success: boolean;
  latency_ms: number;
  server_version: string | null;
  error: string | null;
}

export interface CollectionInfo {
  name: string;
  count: number;
  size_bytes: number;
}

export interface DatabaseInfo {
  name: string;
  size_on_disk: number;
  empty: boolean;
  collections: CollectionInfo[];
}

// ==========================================
// Document Explorer Types
// ==========================================

export interface QueryParams {
  connection_id: string;
  database: string;
  collection: string;
  filter: string;
  sort?: string;
  projection?: string;
  limit: number;
  skip: number;
}

export interface QueryResult {
  documents: Record<string, unknown>[];
  total_count: number;
  page: number;
  page_size: number;
  elapsed_ms: number;
}

export interface ExplainResult {
  stage: string;
  is_collection_scan: boolean;
  execution_time_millis: number;
  total_docs_examined: number;
  total_keys_examined: number;
  n_returned: number;
  index_name: string | null;
  raw_stats_json: string;
}

// ==========================================
// Backup & Restore Types
// ==========================================

export interface BackupConfig {
  connection_id: string;
  database: string;
  collections: string[];
  query_filter?: string;
  output_path: string;
  gzip: boolean;
  archive: boolean;
}

export interface RestoreConfig {
  connection_id: string;
  database: string;
  input_path: string;
  drop_existing: boolean;
  ns_include?: string;
  stop_on_error: boolean;
}

export interface ArchiveMetadata {
  path: string;
  size_bytes: number;
  is_valid: boolean;
  detected_database?: string;
}

export interface BackupFileInfo {
  filename: string;
  path: string;
  size_bytes: number;
  created_at: string;
}

// ==========================================
// Index Management Types
// ==========================================

export interface IndexInfo {
  name: string;
  keys: [string, number][];
  unique: boolean;
  sparse: boolean;
  size_bytes: number;
}

export interface CreateIndexRequest {
  connection_id: string;
  database: string;
  collection: string;
  keys: [string, number][];
  name?: string;
  unique: boolean;
  sparse: boolean;
}

export interface DropIndexRequest {
  connection_id: string;
  database: string;
  collection: string;
  index_name: string;
}

// ==========================================
// Export & Import Types
// ==========================================

export type ExportFormat = "json" | "csv" | "ndjson";
export type MaskingRuleType = "email" | "phone" | "hashsha256" | "redact";

export interface MaskingRule {
  field_name: string;
  rule_type: MaskingRuleType;
}

export interface ExportConfig {
  connection_id: string;
  database: string;
  collection: string;
  format: ExportFormat;
  fields: string[];
  filter?: string;
  masking_rules: MaskingRule[];
  output_path: string;
}

export type ConflictMode = "upsert" | "skip" | "stoponerror";

export interface ImportConfig {
  connection_id: string;
  database: string;
  collection: string;
  format: ExportFormat;
  input_path: string;
  conflict_mode: ConflictMode;
}

export interface ImportPreview {
  format: ExportFormat;
  total_preview_rows: number;
  headers: string[];
  preview_records: Record<string, unknown>[];
}

export interface JobSummary {
  success: boolean;
  records_processed: number;
  bytes_transferred: number;
  elapsed_ms: number;
  output_path?: string;
  message: string;
}
