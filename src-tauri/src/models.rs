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
