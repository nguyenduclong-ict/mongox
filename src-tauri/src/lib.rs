pub mod commands;
pub mod models;
pub mod provisioner;

use provisioner::Provisioner;
use std::sync::Arc;

pub struct AppState {
    pub provisioner: Arc<Provisioner>,
}

pub fn run() {
    let provisioner = Provisioner::new().expect("Failed to initialize provisioner service");
    let state = AppState {
        provisioner: Arc::new(provisioner),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            commands::get_tool_statuses,
            commands::ensure_tool_ready,
            commands::test_tool_version
        ])
        .run(tauri::generate_context!())
        .expect("Error while running Mongox application");
}
