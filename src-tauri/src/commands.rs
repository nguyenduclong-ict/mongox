use std::path::Path;
use tauri::{AppHandle, Emitter, State};

use crate::models::{
    ArchiveMetadata, BackupConfig, BackupFileInfo, ConnectionProfile, CreateIndexRequest,
    DatabaseInfo, DownloadProgress, DropIndexRequest, ExportConfig, ExportFormat, ImportConfig,
    ImportPreview, IndexInfo, JobSummary, PingResult, QueryParams, QueryResult, RestoreConfig,
    ToolKind, ToolStatus,
};
use crate::process_runner::{create_hidden_command, ProcessRunner};
use crate::AppState;

#[tauri::command]
pub async fn get_tool_statuses(state: State<'_, AppState>) -> Result<Vec<ToolStatus>, String> {
    Ok(state.provisioner.get_all_tool_statuses())
}

#[tauri::command]
pub async fn ensure_tool_ready(
    app: AppHandle,
    state: State<'_, AppState>,
    tool_name: String,
) -> Result<String, String> {
    let tool = ToolKind::from_str_name(&tool_name)
        .ok_or_else(|| format!("Unknown tool identifier: {}", tool_name))?;

    let app_handle = app.clone();
    let path = state
        .provisioner
        .ensure_tool_ready(tool, move |progress: DownloadProgress| {
            let _ = app_handle.emit("provisioning://progress", progress);
        })
        .await?;

    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn test_tool_version(
    state: State<'_, AppState>,
    tool_name: String,
) -> Result<String, String> {
    let tool = ToolKind::from_str_name(&tool_name)
        .ok_or_else(|| format!("Unknown tool identifier: {}", tool_name))?;

    let path = match state.provisioner.find_tool(tool) {
        Some((p, _)) if p.is_file() => p,
        _ => return Err(format!("Tool '{}' is not present on disk", tool_name)),
    };

    let output = create_hidden_command(&path)
        .arg("--version")
        .output()
        .await
        .map_err(|e| format!("Failed to execute {:?}: {}", path, e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(stdout.trim().to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!(
            "Command exited with status {}: {}",
            output.status, stderr
        ))
    }
}

// ==========================================
// Connection Commands
// ==========================================

#[tauri::command]
pub async fn list_connections(
    state: State<'_, AppState>,
) -> Result<Vec<ConnectionProfile>, String> {
    Ok(state.connection_manager.list_profiles())
}

#[tauri::command]
pub async fn save_connection(
    state: State<'_, AppState>,
    profile: ConnectionProfile,
) -> Result<ConnectionProfile, String> {
    state.connection_manager.save_profile(profile)
}

#[tauri::command]
pub async fn delete_connection(state: State<'_, AppState>, id: String) -> Result<(), String> {
    state.connection_manager.delete_profile(&id)
}

#[tauri::command]
pub async fn test_connection(
    state: State<'_, AppState>,
    uri: String,
) -> Result<PingResult, String> {
    let mongosh_path = state
        .provisioner
        .find_tool(ToolKind::Mongosh)
        .map(|(p, _)| p);
    crate::connection::ConnectionManager::test_connection(&uri, mongosh_path.as_deref()).await
}

#[tauri::command]
pub async fn get_connection_hierarchy(
    state: State<'_, AppState>,
    id: String,
) -> Result<Vec<DatabaseInfo>, String> {
    let profile = state
        .connection_manager
        .get_profile(&id)
        .ok_or_else(|| format!("Connection profile with id '{}' not found", id))?;

    let mongosh_path = state
        .provisioner
        .find_tool(ToolKind::Mongosh)
        .map(|(p, _)| p);

    crate::connection::ConnectionManager::fetch_hierarchy(&profile.uri, mongosh_path.as_deref())
        .await
}

// ==========================================
// Document Explorer Commands
// ==========================================

#[tauri::command]
pub async fn execute_query(
    state: State<'_, AppState>,
    params: QueryParams,
) -> Result<QueryResult, String> {
    let profile = state
        .connection_manager
        .get_profile(&params.connection_id)
        .ok_or_else(|| format!("Connection profile '{}' not found", params.connection_id))?;

    let mongosh_path = state
        .provisioner
        .find_tool(ToolKind::Mongosh)
        .map(|(p, _)| p);

    ProcessRunner::execute_query(&profile.uri, &params, mongosh_path.as_deref()).await
}

#[tauri::command]
pub async fn insert_document(
    state: State<'_, AppState>,
    connection_id: String,
    database: String,
    collection: String,
    document_json: String,
) -> Result<String, String> {
    let profile = state
        .connection_manager
        .get_profile(&connection_id)
        .ok_or_else(|| format!("Connection profile '{}' not found", connection_id))?;

    let mongosh_path = state
        .provisioner
        .find_tool(ToolKind::Mongosh)
        .map(|(p, _)| p);

    ProcessRunner::insert_document(
        &profile.uri,
        &database,
        &collection,
        &document_json,
        mongosh_path.as_deref(),
    )
    .await
}

#[tauri::command]
pub async fn update_document(
    state: State<'_, AppState>,
    connection_id: String,
    database: String,
    collection: String,
    id: String,
    patch_json: String,
) -> Result<u64, String> {
    let profile = state
        .connection_manager
        .get_profile(&connection_id)
        .ok_or_else(|| format!("Connection profile '{}' not found", connection_id))?;

    let mongosh_path = state
        .provisioner
        .find_tool(ToolKind::Mongosh)
        .map(|(p, _)| p);

    ProcessRunner::update_document(
        &profile.uri,
        &database,
        &collection,
        &id,
        &patch_json,
        mongosh_path.as_deref(),
    )
    .await
}

#[tauri::command]
pub async fn delete_document(
    state: State<'_, AppState>,
    connection_id: String,
    database: String,
    collection: String,
    id: String,
) -> Result<u64, String> {
    let profile = state
        .connection_manager
        .get_profile(&connection_id)
        .ok_or_else(|| format!("Connection profile '{}' not found", connection_id))?;

    let mongosh_path = state
        .provisioner
        .find_tool(ToolKind::Mongosh)
        .map(|(p, _)| p);

    ProcessRunner::delete_document(
        &profile.uri,
        &database,
        &collection,
        &id,
        mongosh_path.as_deref(),
    )
    .await
}

// ==========================================
// Backup & Restore Commands
// ==========================================

#[tauri::command]
pub async fn run_backup(
    state: State<'_, AppState>,
    config: BackupConfig,
) -> Result<JobSummary, String> {
    let profile = state
        .connection_manager
        .get_profile(&config.connection_id)
        .ok_or_else(|| format!("Connection profile '{}' not found", config.connection_id))?;

    let mongodump_path = state
        .provisioner
        .find_tool(ToolKind::Mongodump)
        .map(|(p, _)| p);

    crate::backup_service::BackupService::run_backup(
        &profile.uri,
        &config,
        mongodump_path.as_deref(),
    )
    .await
}

#[tauri::command]
pub async fn run_restore(
    state: State<'_, AppState>,
    config: RestoreConfig,
) -> Result<JobSummary, String> {
    let profile = state
        .connection_manager
        .get_profile(&config.connection_id)
        .ok_or_else(|| format!("Connection profile '{}' not found", config.connection_id))?;

    let mongorestore_path = state
        .provisioner
        .find_tool(ToolKind::Mongorestore)
        .map(|(p, _)| p);

    crate::backup_service::BackupService::run_restore(
        &profile.uri,
        &config,
        mongorestore_path.as_deref(),
    )
    .await
}

#[tauri::command]
pub async fn inspect_archive(archive_path: String) -> Result<ArchiveMetadata, String> {
    crate::backup_service::BackupService::inspect_archive(Path::new(&archive_path))
}

#[tauri::command]
pub async fn list_backup_files() -> Result<Vec<BackupFileInfo>, String> {
    Ok(crate::backup_service::BackupService::list_backup_files())
}

#[tauri::command]
pub async fn open_backup_directory() -> Result<(), String> {
    crate::backup_service::BackupService::open_backup_directory()
}

#[tauri::command]
pub async fn get_default_backup_dir() -> Result<String, String> {
    Ok(
        crate::backup_service::BackupService::get_default_backup_dir()
            .to_string_lossy()
            .to_string(),
    )
}

// ==========================================
// Index Management Commands
// ==========================================

#[tauri::command]
pub async fn list_indexes(
    state: State<'_, AppState>,
    connection_id: String,
    database: String,
    collection: String,
) -> Result<Vec<IndexInfo>, String> {
    let profile = state
        .connection_manager
        .get_profile(&connection_id)
        .ok_or_else(|| format!("Connection profile '{}' not found", connection_id))?;

    let mongosh_path = state
        .provisioner
        .find_tool(ToolKind::Mongosh)
        .map(|(p, _)| p);

    ProcessRunner::list_indexes(
        &profile.uri,
        &database,
        &collection,
        mongosh_path.as_deref(),
    )
    .await
}

#[tauri::command]
pub async fn create_index(
    state: State<'_, AppState>,
    req: CreateIndexRequest,
) -> Result<String, String> {
    let profile = state
        .connection_manager
        .get_profile(&req.connection_id)
        .ok_or_else(|| format!("Connection profile '{}' not found", req.connection_id))?;

    let mongosh_path = state
        .provisioner
        .find_tool(ToolKind::Mongosh)
        .map(|(p, _)| p);

    ProcessRunner::create_index(&profile.uri, &req, mongosh_path.as_deref()).await
}

#[tauri::command]
pub async fn drop_index(
    state: State<'_, AppState>,
    req: DropIndexRequest,
) -> Result<String, String> {
    let profile = state
        .connection_manager
        .get_profile(&req.connection_id)
        .ok_or_else(|| format!("Connection profile '{}' not found", req.connection_id))?;

    let mongosh_path = state
        .provisioner
        .find_tool(ToolKind::Mongosh)
        .map(|(p, _)| p);

    ProcessRunner::drop_index(&profile.uri, &req, mongosh_path.as_deref()).await
}

// ==========================================
// Export & Import Commands
// ==========================================

#[tauri::command]
pub async fn run_export(
    state: State<'_, AppState>,
    config: ExportConfig,
) -> Result<JobSummary, String> {
    let profile = state
        .connection_manager
        .get_profile(&config.connection_id)
        .ok_or_else(|| format!("Connection profile '{}' not found", config.connection_id))?;

    let mongoexport_path = state
        .provisioner
        .find_tool(ToolKind::Mongoexport)
        .map(|(p, _)| p);

    crate::export_import::ExportImportService::run_export(
        &profile.uri,
        &config,
        mongoexport_path.as_deref(),
    )
    .await
}

#[tauri::command]
pub async fn run_import(
    state: State<'_, AppState>,
    config: ImportConfig,
) -> Result<JobSummary, String> {
    let profile = state
        .connection_manager
        .get_profile(&config.connection_id)
        .ok_or_else(|| format!("Connection profile '{}' not found", config.connection_id))?;

    let mongoimport_path = state
        .provisioner
        .find_tool(ToolKind::Mongoimport)
        .map(|(p, _)| p);

    crate::export_import::ExportImportService::run_import(
        &profile.uri,
        &config,
        mongoimport_path.as_deref(),
    )
    .await
}

#[tauri::command]
pub async fn preview_import_file(
    input_path: String,
    format: String,
) -> Result<ImportPreview, String> {
    let fmt = match format.to_lowercase().as_str() {
        "csv" => ExportFormat::Csv,
        "ndjson" => ExportFormat::Ndjson,
        _ => ExportFormat::Json,
    };
    crate::export_import::ExportImportService::preview_import_file(Path::new(&input_path), fmt)
}
