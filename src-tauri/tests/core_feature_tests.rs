use std::fs::File;
use std::io::Write;
use tempfile::tempdir;

use mongox_lib::backup_service::BackupService;
use mongox_lib::connection::ConnectionManager;
use mongox_lib::export_import::ExportImportService;
use mongox_lib::models::{
    BackupConfig, ConflictMode, ConnectionProfile, DropIndexRequest, Environment, ExportConfig,
    ExportFormat, ImportConfig, MaskingRule, MaskingRuleType, QueryParams, RestoreConfig,
};
use mongox_lib::process_runner::ProcessRunner;

#[test]
fn test_connection_profile_persistence_and_serialization() {
    let dir = tempdir().unwrap();
    let manager = ConnectionManager::new(dir.path()).unwrap();

    let initial = manager.list_profiles();
    assert_eq!(initial.len(), 0);

    // Add production profile
    let prod_profile = ConnectionProfile {
        id: String::new(),
        name: "Atlas Production Cluster".to_string(),
        uri: "mongodb+srv://admin:Secr3tP@ss@cluster0.example.com/production?ssl=true".to_string(),
        environment: Environment::Production,
        created_at: String::new(),
        updated_at: String::new(),
        ..Default::default()
    };

    let saved = manager.save_profile(prod_profile).unwrap();
    assert!(!saved.id.is_empty());
    assert_eq!(saved.environment, Environment::Production);

    // Verify sanitization
    let sanitized = ConnectionManager::sanitize_uri(&saved.uri);
    assert_eq!(
        sanitized,
        "mongodb+srv://admin:***@cluster0.example.com/production?ssl=true"
    );

    // Verify list contains saved profile
    let list = manager.list_profiles();
    assert_eq!(list.len(), 1);

    // Reload from disk into new instance
    let manager2 = ConnectionManager::new(dir.path()).unwrap();
    let reloaded = manager2.get_profile(&saved.id).unwrap();
    assert_eq!(reloaded.name, "Atlas Production Cluster");
    assert_eq!(reloaded.environment, Environment::Production);
}

#[test]
fn test_query_script_generation_with_pagination() {
    let params = QueryParams {
        connection_id: "conn-1".to_string(),
        database: "analytics_db".to_string(),
        collection: "events".to_string(),
        filter: "{\"category\": \"click\", \"value\": {\"$gt\": 10}}".to_string(),
        sort: Some("{\"timestamp\": -1}".to_string()),
        projection: Some("{\"ip_address\": 0}".to_string()),
        limit: 100,
        skip: 200,
    };

    let script = ProcessRunner::build_query_script(&params);
    assert!(script.contains("analytics_db"));
    assert!(script.contains("events"));
    assert!(script.contains("{\"category\": \"click\", \"value\": {\"$gt\": 10}}"));
    assert!(script.contains(".sort({\"timestamp\": -1})"));
    assert!(script.contains(".project({\"ip_address\": 0})"));
    assert!(script.contains(".skip(200)"));
    assert!(script.contains(".limit(100)"));
}

#[test]
fn test_backup_and_restore_argument_builders() {
    let dump_cfg = BackupConfig {
        connection_id: "conn-prod".to_string(),
        database: "ecommerce".to_string(),
        collections: vec!["orders".to_string()],
        query_filter: None,
        custom_args: Some("--verbose".to_string()),
        output_path: "C:\\snapshots\\backup.dump.gz".to_string(),
        gzip: true,
        archive: true,
    };

    let dump_args = BackupService::build_dump_arguments("mongodb://localhost:27017", &dump_cfg);
    assert!(dump_args.contains(&"--db=ecommerce".to_string()));
    assert!(dump_args.contains(&"--collection=orders".to_string()));
    assert!(dump_args.contains(&"--verbose".to_string()));
    assert!(dump_args.contains(&"--gzip".to_string()));
    assert!(dump_args.contains(&"--archive=C:\\snapshots\\backup.dump.gz".to_string()));

    let restore_cfg = RestoreConfig {
        connection_id: "conn-prod".to_string(),
        database: "ecommerce".to_string(),
        input_path: "C:\\snapshots\\backup.dump.gz".to_string(),
        drop_existing: true,
        ns_include: Some("ecommerce.orders".to_string()),
        custom_args: None,
        stop_on_error: true,
    };

    let restore_args =
        BackupService::build_restore_arguments("mongodb://localhost:27017", &restore_cfg);
    assert!(restore_args.contains(&"--nsInclude=ecommerce.orders".to_string()));
    assert!(restore_args.contains(&"--drop".to_string()));
    assert!(restore_args.contains(&"--stopOnError".to_string()));
    assert!(restore_args.contains(&"--gzip".to_string()));
    assert!(restore_args.contains(&"--archive=C:\\snapshots\\backup.dump.gz".to_string()));
}

#[test]
fn test_data_masking_transformations() {
    let mut doc = serde_json::json!({
        "_id": "6631a0e19f1b2c001a123456",
        "name": "Alice Smith",
        "email": "alice.smith@example.org",
        "phone": "+1-800-555-0199",
        "api_key": "live_secret_key_abcdef123456",
        "internal_notes": "VIP customer account"
    });

    let rules = vec![
        MaskingRule {
            field_name: "email".to_string(),
            rule_type: MaskingRuleType::Email,
        },
        MaskingRule {
            field_name: "phone".to_string(),
            rule_type: MaskingRuleType::Phone,
        },
        MaskingRule {
            field_name: "api_key".to_string(),
            rule_type: MaskingRuleType::HashSha256,
        },
        MaskingRule {
            field_name: "internal_notes".to_string(),
            rule_type: MaskingRuleType::Redact,
        },
    ];

    ExportImportService::apply_masking(&mut doc, &rules);

    assert_eq!(doc["email"], "a***@example.org");
    assert_eq!(doc["phone"], "***-***-0199");
    assert_eq!(doc["internal_notes"], "[REDACTED]");
    assert_ne!(doc["api_key"], "live_secret_key_abcdef123456");
    assert_eq!(doc["api_key"].as_str().unwrap().len(), 64);
}

#[test]
fn test_import_preview_csv_and_ndjson() {
    let dir = tempdir().unwrap();

    // 1. CSV test file
    let csv_path = dir.path().join("test.csv");
    {
        let mut f = File::create(&csv_path).unwrap();
        writeln!(f, "id,name,role").unwrap();
        writeln!(f, "1,Alice,Admin").unwrap();
        writeln!(f, "2,Bob,Developer").unwrap();
    }

    let csv_preview =
        ExportImportService::preview_import_file(&csv_path, ExportFormat::Csv).unwrap();
    assert_eq!(csv_preview.total_preview_rows, 2);
    assert_eq!(csv_preview.headers, vec!["id", "name", "role"]);
    assert_eq!(csv_preview.preview_records[0]["name"], "Alice");

    // 2. NDJSON test file
    let ndjson_path = dir.path().join("test.ndjson");
    {
        let mut f = File::create(&ndjson_path).unwrap();
        writeln!(f, "{{\"id\": 10, \"sku\": \"SKU-001\"}}").unwrap();
        writeln!(f, "{{\"id\": 11, \"sku\": \"SKU-002\"}}").unwrap();
    }

    let ndjson_preview =
        ExportImportService::preview_import_file(&ndjson_path, ExportFormat::Ndjson).unwrap();
    assert_eq!(ndjson_preview.total_preview_rows, 2);
    assert_eq!(ndjson_preview.preview_records[1]["sku"], "SKU-002");
}

#[test]
fn test_export_and_import_argument_builders() {
    let export_cfg = ExportConfig {
        connection_id: "c1".to_string(),
        database: "mydb".to_string(),
        collection: "orders".to_string(),
        format: ExportFormat::Json,
        fields: vec!["_id".to_string(), "total".to_string()],
        filter: Some("{\"status\":\"paid\"}".to_string()),
        masking_rules: Vec::new(),
        output_path: "orders.json".to_string(),
    };

    let export_args =
        ExportImportService::build_export_arguments("mongodb://localhost:27017", &export_cfg);
    assert!(export_args.contains(&"--db=mydb".to_string()));
    assert!(export_args.contains(&"--collection=orders".to_string()));
    assert!(export_args.contains(&"--type=json".to_string()));
    assert!(export_args.contains(&"--jsonArray".to_string()));
    assert!(export_args.contains(&"--fields=_id,total".to_string()));
    assert!(export_args.contains(&"--query={\"status\":\"paid\"}".to_string()));

    let import_cfg = ImportConfig {
        connection_id: "c1".to_string(),
        database: "mydb".to_string(),
        collection: "orders".to_string(),
        format: ExportFormat::Csv,
        input_path: "orders.csv".to_string(),
        conflict_mode: ConflictMode::StopOnError,
        drop_existing: false,
        ignore_blanks: false,
    };

    let import_args =
        ExportImportService::build_import_arguments("mongodb://localhost:27017", &import_cfg);
    assert!(import_args.contains(&"--db=mydb".to_string()));
    assert!(import_args.contains(&"--collection=orders".to_string()));
    assert!(import_args.contains(&"--type=csv".to_string()));
    assert!(import_args.contains(&"--headerline".to_string()));
    assert!(import_args.contains(&"--stopOnError".to_string()));
    assert!(import_args.contains(&"--file=orders.csv".to_string()));
}

// ==========================================
// Shipped Execution Function Integration Tests
// ==========================================

#[tokio::test]
async fn test_backup_directory_and_archive_listing() {
    let backup_dir = BackupService::get_default_backup_dir();
    assert!(backup_dir.is_dir());

    let test_archive_path = backup_dir.join("test_integration_snap.dump.gz");
    {
        let mut f = File::create(&test_archive_path).unwrap();
        writeln!(f, "fake_gzip_archive_content_for_test").unwrap();
    }

    let files = BackupService::list_backup_files();
    let found = files
        .iter()
        .find(|f| f.filename == "test_integration_snap.dump.gz");
    assert!(found.is_some());
    let file_info = found.unwrap();
    assert!(file_info.size_bytes > 0);
    assert!(!file_info.created_at.is_empty());

    // Clean up test archive
    let _ = std::fs::remove_file(test_archive_path);
}

#[tokio::test]
async fn test_missing_tools_and_security_guards() {
    let dir = tempdir().unwrap();
    let export_out = dir.path().join("out.csv");
    let export_cfg = ExportConfig {
        connection_id: "c1".to_string(),
        database: "db".to_string(),
        collection: "col".to_string(),
        format: ExportFormat::Csv,
        fields: vec!["_id".to_string()],
        filter: None,
        masking_rules: vec![],
        output_path: export_out.to_string_lossy().to_string(),
    };

    let export_err =
        ExportImportService::run_export("mongodb://localhost:27017", &export_cfg, None).await;
    assert!(export_err.is_err());
    assert!(export_err
        .unwrap_err()
        .contains("mongoexport engine is not available"));

    let backup_cfg = BackupConfig {
        connection_id: "c1".to_string(),
        database: "db".to_string(),
        collections: vec![],
        query_filter: None,
        custom_args: None,
        output_path: "backup.dump.gz".to_string(),
        gzip: true,
        archive: true,
    };
    let backup_err =
        BackupService::run_backup("mongodb://localhost:27017", &backup_cfg, None).await;
    assert!(backup_err.is_err());
    assert!(backup_err
        .unwrap_err()
        .contains("mongodump engine is not available"));

    let restore_cfg = RestoreConfig {
        connection_id: "c1".to_string(),
        database: "db".to_string(),
        input_path: "backup.dump.gz".to_string(),
        drop_existing: false,
        ns_include: None,
        custom_args: None,
        stop_on_error: true,
    };
    let restore_err =
        BackupService::run_restore("mongodb://localhost:27017", &restore_cfg, None).await;
    assert!(restore_err.is_err());
    assert!(restore_err
        .unwrap_err()
        .contains("mongorestore engine is not available"));

    let query_params = QueryParams {
        connection_id: "c1".to_string(),
        database: "db".to_string(),
        collection: "col".to_string(),
        filter: "{}".to_string(),
        sort: None,
        projection: None,
        limit: 10,
        skip: 0,
    };
    let query_err =
        ProcessRunner::execute_query("mongodb://localhost:27017", &query_params, None).await;
    assert!(query_err.is_err());
    assert!(query_err
        .unwrap_err()
        .contains("mongosh engine is not available"));

    let drop_id_req = DropIndexRequest {
        connection_id: "c1".to_string(),
        database: "db".to_string(),
        collection: "col".to_string(),
        index_name: "_id_".to_string(),
    };
    let drop_id_res =
        ProcessRunner::drop_index("mongodb://localhost:27017", &drop_id_req, None).await;
    assert!(drop_id_res.is_err());
    assert!(drop_id_res
        .unwrap_err()
        .contains("Cannot drop default _id_ index"));
}
