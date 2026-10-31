pub mod backup_service;
pub mod commands;
pub mod connection;
pub mod export_import;
pub mod models;
pub mod process_runner;
pub mod provisioner;

use connection::ConnectionManager;
use provisioner::Provisioner;
use std::sync::Arc;

pub struct AppState {
    pub provisioner: Arc<Provisioner>,
    pub connection_manager: Arc<ConnectionManager>,
}

pub fn run() {
    let provisioner = Provisioner::new().expect("Failed to initialize provisioner service");
    let app_data_dir = provisioner
        .get_local_bin_dir()
        .parent()
        .expect("Failed to get app data directory");
    let connection_manager =
        ConnectionManager::new(app_data_dir).expect("Failed to initialize connection manager");

    let state = AppState {
        provisioner: Arc::new(provisioner),
        connection_manager: Arc::new(connection_manager),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            commands::get_tool_statuses,
            commands::ensure_tool_ready,
            commands::test_tool_version,
            commands::list_connections,
            commands::save_connection,
            commands::delete_connection,
            commands::test_connection,
            commands::get_connection_hierarchy,
            commands::execute_query,
            commands::explain_query,
            commands::insert_document,
            commands::update_document,
            commands::delete_document,
            commands::run_backup,
            commands::run_restore,
            commands::inspect_archive,
            commands::list_backup_files,
            commands::open_backup_directory,
            commands::get_default_backup_dir,
            commands::list_indexes,
            commands::create_index,
            commands::drop_index,
            commands::run_export,
            commands::run_import,
            commands::preview_import_file,
            commands::list_database_users,
            commands::create_database_user,
            commands::update_database_user,
            commands::drop_database_user,
            commands::select_path_dialog
        ])
        .run(tauri::generate_context!())
        .expect("Error while running Mongox application");
}
