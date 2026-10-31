import {
  ToolStatus,
  DownloadProgress,
  ConnectionProfile,
  PingResult,
  DatabaseInfo,
  QueryParams,
  QueryResult,
  ExplainResult,
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
  MongoUser,
  CreateUserRequest,
  UpdateUserRequest,
} from "../types";

// Check if running inside native Tauri desktop environment
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
    { name: "mongosh", bundle: "shell", is_available: true, path: "mongosh", source: "system_path" },
    { name: "mongodump", bundle: "databasetools", is_available: true, path: "mongodump", source: "system_path" },
    { name: "mongorestore", bundle: "databasetools", is_available: true, path: "mongorestore", source: "system_path" },
    { name: "mongoexport", bundle: "databasetools", is_available: true, path: "mongoexport", source: "system_path" },
    { name: "mongoimport", bundle: "databasetools", is_available: true, path: "mongoimport", source: "system_path" },
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

  if (onProgress) {
    const bundle = toolName === "mongosh" ? "shell" : "databasetools";
    const total = 45 * 1024 * 1024;
    onProgress({
      bundle,
      stage: "ready",
      downloaded_bytes: total,
      total_bytes: total,
      progress_percent: 100.0,
      speed_bytes_per_sec: 0,
      message: `${toolName} ready.`,
    });
  }

  return toolName;
}

export async function testToolVersion(toolName: string): Promise<string> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<string>("test_tool_version", { toolName });
  }

  return `${toolName} version v2.6.0 (Host Verified)`;
}

// ==========================================
// Connection Manager APIs
// ==========================================

export async function listConnections(): Promise<ConnectionProfile[]> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<ConnectionProfile[]>("list_connections");
  }

  const res = await fetch("/api/mongo/connections");
  if (!res.ok) return [];
  return await res.json();
}

export async function saveConnection(profile: ConnectionProfile): Promise<ConnectionProfile> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<ConnectionProfile>("save_connection", { profile });
  }

  const res = await fetch("/api/mongo/connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
  });
  if (!res.ok) throw new Error("Failed to save connection profile");
  return await res.json();
}

export async function deleteConnection(id: string): Promise<void> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke<void>("delete_connection", { id });
    return;
  }

  await fetch(`/api/mongo/connections?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function testConnection(uri: string): Promise<PingResult> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<PingResult>("test_connection", { uri });
  }

  const res = await fetch("/api/mongo/ping", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uri }),
  });
  if (!res.ok) {
    return {
      success: false,
      latency_ms: 0,
      server_version: null,
      error: `HTTP Error ${res.status}: Failed to reach bridge server`,
    };
  }
  return await res.json();
}

export async function getConnectionHierarchy(id: string): Promise<DatabaseInfo[]> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<DatabaseInfo[]>("get_connection_hierarchy", { id });
  }

  const res = await fetch(`/api/mongo/hierarchy?id=${encodeURIComponent(id)}`);
  if (!res.ok) return [];
  return await res.json();
}

// ==========================================
// Document Explorer APIs
// ==========================================

export async function executeQuery(params: QueryParams): Promise<QueryResult> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<QueryResult>("execute_query", { params });
  }

  const res = await fetch("/api/mongo/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error(`Query failed with status ${res.status}`);
  }
  return await res.json();
}

export async function explainQuery(params: QueryParams): Promise<ExplainResult> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<ExplainResult>("explain_query", { params });
  }

  const res = await fetch("/api/mongo/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error(`Explain failed with status ${res.status}`);
  }
  return await res.json();
}

export async function insertDocument(
  connectionId: string,
  database: string,
  collection: string,
  document: Record<string, unknown> | string
): Promise<string> {
  const documentJson = typeof document === "string" ? document : JSON.stringify(document);

  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<string>("insert_document", {
      connectionId,
      database,
      collection,
      documentJson,
    });
  }

  const res = await fetch("/api/mongo/insert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      connection_id: connectionId,
      database,
      collection,
      document,
      documentJson,
    }),
  });
  if (!res.ok) {
    throw new Error(`Insert failed with status ${res.status}`);
  }
  const data = await res.json();
  return data.id;
}

export async function updateDocument(
  connectionId: string,
  database: string,
  collection: string,
  id: string,
  updates: Record<string, unknown> | string
): Promise<void> {
  const patchJson = typeof updates === "string" ? updates : JSON.stringify(updates);

  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke<void>("update_document", {
      connectionId,
      database,
      collection,
      id,
      patchJson,
    });
    return;
  }

  const res = await fetch("/api/mongo/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      connection_id: connectionId,
      database,
      collection,
      id,
      patchJson,
      updates,
    }),
  });
  if (!res.ok) {
    throw new Error(`Update failed with status ${res.status}`);
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
    return;
  }

  const res = await fetch("/api/mongo/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      connection_id: connectionId,
      database,
      collection,
      id,
    }),
  });
  if (!res.ok) {
    throw new Error(`Delete failed with status ${res.status}`);
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

  const res = await fetch("/api/mongo/backup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error(`Backup failed with status ${res.status}`);
  return await res.json();
}

export async function runRestore(config: RestoreConfig): Promise<JobSummary> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<JobSummary>("run_restore", { config });
  }

  const res = await fetch("/api/mongo/restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error(`Restore failed with status ${res.status}`);
  return await res.json();
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
    detected_database: "test_db",
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

  return "backups";
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

  const res = await fetch(
    `/api/mongo/indexes?connection_id=${encodeURIComponent(connectionId)}&database=${encodeURIComponent(database)}&collection=${encodeURIComponent(collection)}`
  );
  if (!res.ok) return [];
  return await res.json();
}

export async function createIndex(req: CreateIndexRequest): Promise<string> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<string>("create_index", { req });
  }

  const res = await fetch("/api/mongo/indexes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error("Failed to create index");
  return await res.json();
}

export async function dropIndex(req: DropIndexRequest): Promise<string> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<string>("drop_index", { req });
  }

  const res = await fetch("/api/mongo/indexes", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error("Failed to drop index");
  return await res.json();
}

// ==========================================
// Export & Import APIs
// ==========================================

export async function runExport(config: ExportConfig): Promise<JobSummary> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<JobSummary>("run_export", { config });
  }

  const res = await fetch("/api/mongo/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error(`Export failed with status ${res.status}`);
  return await res.json();
}

export async function runImport(config: ImportConfig): Promise<JobSummary> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<JobSummary>("run_import", { config });
  }

  const res = await fetch("/api/mongo/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error(`Import failed with status ${res.status}`);
  return await res.json();
}

export async function previewImportFile(
  filePath: string,
  _formatOrRows?: string | number
): Promise<ImportPreview> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    const maxRows = typeof _formatOrRows === "number" ? _formatOrRows : 10;
    return await invoke<ImportPreview>("preview_import_file", { filePath, maxRows });
  }

  return {
    format: "csv",
    total_preview_rows: 2,
    headers: ["id", "name", "email", "status"],
    preview_records: [
      { id: "1", name: "Alice", email: "alice@example.com", status: "active" },
      { id: "2", name: "Bob", email: "bob@example.com", status: "pending" },
    ],
  };
}

export const previewImport = previewImportFile;

export async function dropDatabase(connectionId: string, database: string): Promise<void> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke<void>("drop_database", { connectionId, database });
    return;
  }

  await fetch("/api/mongo/drop-database", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ connection_id: connectionId, database }),
  });
}

export async function dropCollection(
  connectionId: string,
  database: string,
  collection: string
): Promise<void> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke<void>("drop_collection", { connectionId, database, collection });
    return;
  }

  await fetch("/api/mongo/drop-collection", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ connection_id: connectionId, database, collection }),
  });
}

// ==========================================
// User Management APIs
// ==========================================

export async function listDatabaseUsers(
  connectionId: string,
  database: string
): Promise<MongoUser[]> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<MongoUser[]>("list_database_users", {
      connectionId,
      database,
    });
  }

  const res = await fetch(
    `/api/mongo/users?connection_id=${encodeURIComponent(connectionId)}&database=${encodeURIComponent(database)}`
  );
  if (!res.ok) return [];
  return await res.json();
}

export async function createDatabaseUser(req: CreateUserRequest): Promise<void> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke<void>("create_database_user", { req });
    return;
  }

  const res = await fetch("/api/mongo/users/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create user");
  }
}

export async function updateDatabaseUser(req: UpdateUserRequest): Promise<void> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke<void>("update_database_user", { req });
    return;
  }

  const res = await fetch("/api/mongo/users/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update user");
  }
}

export async function dropDatabaseUser(
  connectionId: string,
  database: string,
  username: string
): Promise<void> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke<void>("drop_database_user", {
      connectionId,
      database,
      username,
    });
    return;
  }

  const res = await fetch("/api/mongo/users/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      connection_id: connectionId,
      database,
      username,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to drop user");
  }
}
