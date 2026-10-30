use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ToolKind {
    Mongosh,
    Mongodump,
    Mongorestore,
    Mongoexport,
    Mongoimport,
}

impl ToolKind {
    pub fn executable_name(&self) -> &'static str {
        if cfg!(windows) {
            match self {
                ToolKind::Mongosh => "mongosh.exe",
                ToolKind::Mongodump => "mongodump.exe",
                ToolKind::Mongorestore => "mongorestore.exe",
                ToolKind::Mongoexport => "mongoexport.exe",
                ToolKind::Mongoimport => "mongoimport.exe",
            }
        } else {
            match self {
                ToolKind::Mongosh => "mongosh",
                ToolKind::Mongodump => "mongodump",
                ToolKind::Mongorestore => "mongorestore",
                ToolKind::Mongoexport => "mongoexport",
                ToolKind::Mongoimport => "mongoimport",
            }
        }
    }

    pub fn bundle(&self) -> ToolBundle {
        match self {
            ToolKind::Mongosh => ToolBundle::Shell,
            ToolKind::Mongodump
            | ToolKind::Mongorestore
            | ToolKind::Mongoexport
            | ToolKind::Mongoimport => ToolBundle::DatabaseTools,
        }
    }

    pub fn from_str_name(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "mongosh" => Some(ToolKind::Mongosh),
            "mongodump" => Some(ToolKind::Mongodump),
            "mongorestore" => Some(ToolKind::Mongorestore),
            "mongoexport" => Some(ToolKind::Mongoexport),
            "mongoimport" => Some(ToolKind::Mongoimport),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ToolBundle {
    Shell,
    DatabaseTools,
}

impl ToolBundle {
    pub fn display_name(&self) -> &'static str {
        match self {
            ToolBundle::Shell => "MongoDB Shell (mongosh)",
            ToolBundle::DatabaseTools => "MongoDB Database Tools (dump, restore, export, import)",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolStatus {
    pub name: String,
    pub bundle: ToolBundle,
    pub is_available: bool,
    pub path: Option<String>,
    pub source: Option<String>, // "system_path" or "local_bin"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub bundle: ToolBundle,
    pub stage: String, // "downloading" | "verifying" | "extracting" | "ready" | "failed"
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub progress_percent: f32,
    pub speed_bytes_per_sec: u64,
    pub message: String,
}

// ==========================================
// Connection Manager Models
// ==========================================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Environment {
    #[default]
    Local,
    Development,
    Staging,
    Production,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionProfile {
    pub id: String,
    pub name: String,
    pub uri: String,
    pub environment: Environment,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PingResult {
    pub success: bool,
    pub latency_ms: u64,
    pub server_version: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectionInfo {
    pub name: String,
    pub count: u64,
    pub size_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseInfo {
    pub name: String,
    pub size_on_disk: u64,
    pub empty: bool,
    pub collections: Vec<CollectionInfo>,
}

// ==========================================
// Document Explorer Models
// ==========================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryParams {
    pub connection_id: String,
    pub database: String,
    pub collection: String,
    pub filter: String,
    pub sort: Option<String>,
    pub projection: Option<String>,
    pub limit: u32,
    pub skip: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryResult {
    pub documents: Vec<serde_json::Value>,
    pub total_count: u64,
    pub page: u32,
    pub page_size: u32,
    pub elapsed_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentMutation {
    pub connection_id: String,
    pub database: String,
    pub collection: String,
    pub document_json: String,
    pub id: Option<String>,
}

// ==========================================
// Backup & Restore Models
// ==========================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupConfig {
    pub connection_id: String,
    pub database: String,
    pub collections: Vec<String>,
    pub query_filter: Option<String>,
    pub output_path: String,
    pub gzip: bool,
    pub archive: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RestoreConfig {
    pub connection_id: String,
    pub database: String,
    pub input_path: String,
    pub drop_existing: bool,
    pub ns_include: Option<String>,
    pub stop_on_error: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArchiveMetadata {
    pub path: String,
    pub size_bytes: u64,
    pub is_valid: bool,
    pub detected_database: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupFileInfo {
    pub filename: String,
    pub path: String,
    pub size_bytes: u64,
    pub created_at: String,
}

// ==========================================
// Index Management Models
// ==========================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexInfo {
    pub name: String,
    pub keys: Vec<(String, i32)>,
    pub unique: bool,
    pub sparse: bool,
    pub size_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateIndexRequest {
    pub connection_id: String,
    pub database: String,
    pub collection: String,
    pub keys: Vec<(String, i32)>,
    pub name: Option<String>,
    pub unique: bool,
    pub sparse: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DropIndexRequest {
    pub connection_id: String,
    pub database: String,
    pub collection: String,
    pub index_name: String,
}

// ==========================================
// Export & Import Models
// ==========================================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ExportFormat {
    Json,
    Csv,
    Ndjson,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MaskingRuleType {
    Email,
    Phone,
    HashSha256,
    Redact,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaskingRule {
    pub field_name: String,
    pub rule_type: MaskingRuleType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportConfig {
    pub connection_id: String,
    pub database: String,
    pub collection: String,
    pub format: ExportFormat,
    pub fields: Vec<String>,
    pub filter: Option<String>,
    pub masking_rules: Vec<MaskingRule>,
    pub output_path: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ConflictMode {
    Upsert,
    Skip,
    StopOnError,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportConfig {
    pub connection_id: String,
    pub database: String,
    pub collection: String,
    pub format: ExportFormat,
    pub input_path: String,
    pub conflict_mode: ConflictMode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportPreview {
    pub format: ExportFormat,
    pub total_preview_rows: usize,
    pub headers: Vec<String>,
    pub preview_records: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobSummary {
    pub success: bool,
    pub records_processed: u64,
    pub bytes_transferred: u64,
    pub elapsed_ms: u64,
    pub output_path: Option<String>,
    pub message: String,
}
