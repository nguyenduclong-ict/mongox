import {
  ToolStatus,
  DownloadProgress,
  ConnectionProfile,
  PingResult,
  DatabaseInfo,
  QueryParams,
  QueryResult,
  BackupConfig,
  RestoreConfig,
  ArchiveMetadata,
  BackupFileInfo,
  IndexInfo,
  CreateIndexRequest,
  DropIndexRequest,
  ExportConfig,
  ImportConfig,
  ImportPreview,
  JobSummary,
} from "../types";

// Check if running inside Tauri environment
export const isTauriEnvironment = (): boolean => {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
};

// ==========================================
// Tool Provisioning
// ==========================================

export async function fetchToolStatuses(): Promise<ToolStatus[]> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<ToolStatus[]>("get_tool_statuses");
  }

  return [
    { name: "mongosh", bundle: "shell", is_available: true, path: "C:\\Program Files\\mongosh\\bin\\mongosh.exe", source: "system_path" },
    { name: "mongodump", bundle: "databasetools", is_available: true, path: "C:\\Program Files\\mongodb-tools\\bin\\mongodump.exe", source: "system_path" },
    { name: "mongorestore", bundle: "databasetools", is_available: true, path: "C:\\Program Files\\mongodb-tools\\bin\\mongorestore.exe", source: "system_path" },
    { name: "mongoexport", bundle: "databasetools", is_available: true, path: "C:\\Program Files\\mongodb-tools\\bin\\mongoexport.exe", source: "system_path" },
    { name: "mongoimport", bundle: "databasetools", is_available: true, path: "C:\\Program Files\\mongodb-tools\\bin\\mongoimport.exe", source: "system_path" },
  ];
}

export async function triggerEnsureToolReady(
  toolName: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<string> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    const { listen } = await import("@tauri-apps/api/event");

    let unlisten: (() => void) | undefined;
    if (onProgress) {
      unlisten = await listen<DownloadProgress>("provisioning://progress", (event) => {
        onProgress(event.payload);
      });
    }

    try {
      return await invoke<string>("ensure_tool_ready", { toolName });
    } finally {
      if (unlisten) {
        unlisten();
      }
    }
  }

  // Browser simulation
  if (onProgress) {
    const bundle = toolName === "mongosh" ? "shell" : "databasetools";
    const total = 45 * 1024 * 1024;
    onProgress({
      bundle,
      stage: "downloading",
      downloaded_bytes: total * 0.5,
      total_bytes: total,
      progress_percent: 50.0,
      speed_bytes_per_sec: 6_242_880,
      message: `Downloading ${bundle} archive... (simulated)`,
    });
    await new Promise((r) => setTimeout(r, 400));
    onProgress({
      bundle,
      stage: "verifying",
      downloaded_bytes: total,
      total_bytes: total,
      progress_percent: 100.0,
      speed_bytes_per_sec: 0,
      message: "Verifying SHA-256 cryptographic checksum...",
    });
    await new Promise((r) => setTimeout(r, 300));
    onProgress({
      bundle,
      stage: "ready",
      downloaded_bytes: total,
      total_bytes: total,
      progress_percent: 100.0,
      speed_bytes_per_sec: 0,
      message: "Tool successfully installed and ready.",
    });
  }

  return `C:\\Users\\Mock\\AppData\\Local\\Mongox\\bin\\${toolName}.exe`;
}

export async function testToolVersion(toolName: string): Promise<string> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<string>("test_tool_version", { toolName });
  }

  return `${toolName} version v2.3.8 (Browser Simulation)`;
}

// ==========================================
// Connection Manager APIs
// ==========================================

export async function listConnections(): Promise<ConnectionProfile[]> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<ConnectionProfile[]>("list_connections");
  }

  return [
    {
      id: "local-1",
      name: "Local MongoDB",
      uri: "mongodb://localhost:27017",
      environment: "local",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "prod-atlas",
      name: "Atlas Production Cluster",
      uri: "mongodb+srv://admin:***@cluster0.mongodb.net/production",
      environment: "production",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
}

export async function saveConnection(profile: ConnectionProfile): Promise<ConnectionProfile> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<ConnectionProfile>("save_connection", { profile });
  }

  return {
    ...profile,
    id: profile.id || `conn-${Date.now()}`,
    updated_at: new Date().toISOString(),
  };
}

export async function deleteConnection(id: string): Promise<void> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke<void>("delete_connection", { id });
  }
}

export async function testConnection(uri: string): Promise<PingResult> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<PingResult>("test_connection", { uri });
  }

  return {
    success: true,
    latency_ms: 14,
    server_version: "7.0.5",
    error: null,
  };
}

export async function getConnectionHierarchy(id: string): Promise<DatabaseInfo[]> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<DatabaseInfo[]>("get_connection_hierarchy", { id });
  }

  return [];
}

// ==========================================
// Document Explorer APIs
// ==========================================

export async function executeQuery(params: QueryParams): Promise<QueryResult> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<QueryResult>("execute_query", { params });
  }

  return {
    documents: [],
    total_count: 0,
    page: 1,
    page_size: params.limit,
    elapsed_ms: 0,
  };
}

export async function insertDocument(
  connectionId: string,
  database: string,
  collection: string,
  documentJson: string
): Promise<string> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<string>("insert_document", {
      connectionId,
      database,
      collection,
      documentJson,
    });
  }

  return `doc-${Date.now()}`;
}

export async function updateDocument(
  connectionId: string,
  database: string,
  collection: string,
  id: string,
  patchJson: string
): Promise<void> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke<void>("update_document", {
      connectionId,
      database,
      collection,
      id,
      patchJson,
    });
  }
}

export async function deleteDocument(
  connectionId: string,
  database: string,
  collection: string,
  id: string
): Promise<void> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke<void>("delete_document", {
      connectionId,
      database,
      collection,
      id,
    });
  }
}

// ==========================================
// Backup & Restore APIs
// ==========================================

export async function runBackup(config: BackupConfig): Promise<JobSummary> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<JobSummary>("run_backup", { config });
  }

  return {
    success: true,
    records_processed: 15420,
    bytes_transferred: 8388608,
    elapsed_ms: 850,
    output_path: config.output_path,
    message: "Backup completed successfully (Simulated).",
  };
}

export async function runRestore(config: RestoreConfig): Promise<JobSummary> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<JobSummary>("run_restore", { config });
  }

  return {
    success: true,
    records_processed: 15420,
    bytes_transferred: 8388608,
    elapsed_ms: 1100,
    output_path: config.input_path,
    message: "Restore completed successfully (Simulated).",
  };
}

export async function inspectArchive(archivePath: string): Promise<ArchiveMetadata> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<ArchiveMetadata>("inspect_archive", { archivePath });
  }

  return {
    path: archivePath,
    size_bytes: 4194304,
    is_valid: true,
    detected_database: "store_db",
  };
}

export async function listBackupFiles(): Promise<BackupFileInfo[]> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<BackupFileInfo[]>("list_backup_files");
  }

  return [];
}

export async function openBackupDirectory(): Promise<void> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke<void>("open_backup_directory");
  }
}

export async function getDefaultBackupDir(): Promise<string> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<string>("get_default_backup_dir");
  }

  return "C:\\Users\\Mock\\AppData\\Local\\Mongox\\backups";
}

// ==========================================
// Index Management APIs
// ==========================================

export async function listIndexes(
  connectionId: string,
  database: string,
  collection: string
): Promise<IndexInfo[]> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<IndexInfo[]>("list_indexes", {
      connectionId,
      database,
      collection,
    });
  }

  return [];
}

export async function createIndex(req: CreateIndexRequest): Promise<string> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<string>("create_index", { req });
  }

  return req.name || "index_created";
}

export async function dropIndex(req: DropIndexRequest): Promise<string> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<string>("drop_index", { req });
  }

  return req.index_name;
}

// ==========================================
// Export & Import APIs
// ==========================================

export async function runExport(config: ExportConfig): Promise<JobSummary> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<JobSummary>("run_export", { config });
  }

  return {
    success: true,
    records_processed: 8210,
    bytes_transferred: 1048576,
    elapsed_ms: 450,
    output_path: config.output_path,
    message: `Exported 8,210 records as ${config.format.toUpperCase()} (Simulated).`,
  };
}

export async function runImport(config: ImportConfig): Promise<JobSummary> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<JobSummary>("run_import", { config });
  }

  return {
    success: true,
    records_processed: 5000,
    bytes_transferred: 624288,
    elapsed_ms: 600,
    output_path: config.input_path,
    message: `Imported 5,000 records using mode ${config.conflict_mode} (Simulated).`,
  };
}

export async function previewImportFile(inputPath: string, format: string): Promise<ImportPreview> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<ImportPreview>("preview_import_file", { inputPath, format });
  }

  return {
    format: "json",
    total_preview_rows: 3,
    headers: ["_id", "name", "email", "age", "status"],
    preview_records: [
      { _id: "1", name: "Alice", email: "alice@test.com", age: 28, status: "active" },
      { _id: "2", name: "Bob", email: "bob@test.com", age: 34, status: "inactive" },
      { _id: "3", name: "Charlie", email: "charlie@test.com", age: 22, status: "active" },
    ],
  };
}
