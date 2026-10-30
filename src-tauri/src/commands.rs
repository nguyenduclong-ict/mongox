use tauri::{AppHandle, Emitter, State};

use crate::models::{DownloadProgress, ToolKind, ToolStatus};
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

    let output = tokio::process::Command::new(&path)
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
