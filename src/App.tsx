import React, { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { CollectionWorkspace } from "./components/CollectionWorkspace/CollectionWorkspace";
import { ConnectionModal } from "./components/ConnectionModal";
import { SettingsModal } from "./components/SettingsModal";
import { BackupModal } from "./components/BackupRestore/BackupModal";
import { RestoreModal } from "./components/BackupRestore/RestoreModal";
import { ExportModal } from "./components/ExportImport/ExportModal";
import { ImportModal } from "./components/ExportImport/ImportModal";
import { UserManagementModal } from "./components/UserManagement/UserManagementModal";
import { CreateDatabaseModal } from "./components/CreateDatabaseModal";
import { ProductionGuardModal } from "./components/ProductionGuardModal";
import { ProvisioningModal } from "./components/ProvisioningModal";
import { useProvisioning } from "./hooks/useProvisioning";
import { useConnection } from "./hooks/useConnection";
import {
  BackupConfig,
  ConnectionProfile,
  ExportConfig,
  ImportConfig,
  RestoreConfig,
} from "./types";
import {
  runBackup,
  runRestore,
  runExport,
  runImport,
  previewImportFile,
  inspectArchive,
  insertDocument,
} from "./services/tauri";
import { ToastContainer, ToastMessage } from "./components/ui/Toast";
import { Database, Plus, Layers, FileText, X, Loader2 } from "lucide-react";

interface WorkspaceTab {
  id: string;
  title: string;
  database: string;
  collection: string;
}

export const App: React.FC = () => {
  // Workspace Multi-Tab State
  const [tabs, setTabs] = useState<WorkspaceTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Modal States
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isConnModalOpen, setIsConnModalOpen] = useState<boolean>(false);
  const [editingConn, setEditingConn] = useState<ConnectionProfile | null>(null);

  // Action Modals State
  const [backupModal, setBackupModal] = useState<{
    isOpen: boolean;
    db: string;
    col: string;
  }>({ isOpen: false, db: "", col: "" });

  const [restoreModal, setRestoreModal] = useState<{
    isOpen: boolean;
    db: string;
  }>({ isOpen: false, db: "" });

  const [exportModal, setExportModal] = useState<{
    isOpen: boolean;
    db: string;
    col: string;
  }>({ isOpen: false, db: "", col: "" });

  const [importModal, setImportModal] = useState<{
    isOpen: boolean;
    db: string;
    col: string;
  }>({ isOpen: false, db: "", col: "" });

  const [userMgmtModal, setUserMgmtModal] = useState<{
    isOpen: boolean;
    db: string;
  }>({ isOpen: false, db: "" });

  // Floating Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (
    message: string,
    type: "info" | "success" | "loading" | "error" = "info",
    duration = 4000
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message, duration }]);
    return id;
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Production Guard State
  const [guardState, setGuardState] = useState<{
    isOpen: boolean;
    actionName: string;
    entityName: string;
    onConfirmed: () => Promise<void>;
  }>({
    isOpen: false,
    actionName: "",
    entityName: "",
    onConfirmed: async () => {},
  });

  const [createDbModal, setCreateDbModal] = useState<{
    isOpen: boolean;
    conn: ConnectionProfile | null;
  }>({
    isOpen: false,
    conn: null,
  });

  const {
    tools,
    isDownloading,
    activeDownload,
    versionOutputs,
    ensureTool,
    checkVersion,
  } = useProvisioning();

  const {
    connections,
    activeConnection,
    connectingConnId,
    hierarchy,
    selectedDb,
    selectedCollection,
    pingResult,
    setSelectedDb,
    setSelectedCollection,
    connectConnection,
    disconnectConnection,
    saveProfile,
    removeProfile,
    testPing,
    reloadHierarchy,
  } = useConnection();

  const handleSelectConnection = async (conn: ConnectionProfile) => {
    try {
      await connectConnection(conn);
      addToast(`Connected to ${conn.name}`, "success");
    } catch (err) {
      addToast(
        `Failed to connect to ${conn.name}: ${err instanceof Error ? err.message : String(err)}`,
        "error",
        6000
      );
    }
  };

  const handleDisconnectConnection = (connId: string) => {
    disconnectConnection(connId);
    setTabs([]);
    setActiveTabId(null);
    addToast("Disconnected", "info", 2000);
  };

  const isProduction = activeConnection?.environment === "production";

  // Disable browser default context menu across the desktop application
  React.useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    window.addEventListener("contextmenu", handleContextMenu);
    return () => window.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  // Tab Handlers
  const handleSelectCollection = (db: string, col: string) => {
    const tabId = `tab-${db}-${col}`;
    setTabs((prev) => {
      if (prev.some((t) => t.id === tabId)) {
        return prev;
      }
      return [
        ...prev,
        {
          id: tabId,
          title: col,
          database: db,
          collection: col,
        },
      ];
    });
    setActiveTabId(tabId);
    setSelectedDb(db);
    setSelectedCollection(col);
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTabs((prev) => {
      const updated = prev.filter((t) => t.id !== tabId);
      if (activeTabId === tabId) {
        if (updated.length > 0) {
          const next = updated[updated.length - 1];
          setActiveTabId(next.id);
          setSelectedDb(next.database);
          setSelectedCollection(next.collection);
        } else {
          setActiveTabId(null);
          setSelectedDb(null);
          setSelectedCollection(null);
        }
      }
      return updated;
    });
  };

  const handleSwitchTab = (tab: WorkspaceTab) => {
    setActiveTabId(tab.id);
    setSelectedDb(tab.database);
    setSelectedCollection(tab.collection);
  };

  // Modal Handlers
  const handleOpenNewConn = () => {
    setEditingConn(null);
    setIsConnModalOpen(true);
  };

  const triggerProductionGuard = (
    actionName: string,
    entityName: string,
    onConfirmed: () => Promise<void>
  ) => {
    setGuardState({
      isOpen: true,
      actionName,
      entityName,
      onConfirmed,
    });
  };

  // Action Wizard Runners
  const handleRunBackup = async (config: BackupConfig) => {
    try {
      const res = await runBackup(config);
      const target =
        config.collections && config.collections.length > 0
          ? `${config.database} (${config.collections.join(", ")})`
          : config.database;
      addToast(
        res.message || `Database dump completed successfully for ${target}!`,
        "success"
      );
    } catch (err) {
      addToast(err instanceof Error ? err.message : String(err), "error", 5000);
      throw err;
    }
  };

  const [collectionRefreshKey, setCollectionRefreshKey] = useState<number>(0);

  const handleRefreshConnection = async (_connId?: string) => {
    try {
      await reloadHierarchy();
      addToast("Connection hierarchy refreshed", "info", 2000);
    } catch (err) {
      addToast(err instanceof Error ? err.message : String(err), "error");
    }
  };

  const handleRefreshDatabase = async (dbName: string) => {
    try {
      await reloadHierarchy();
      addToast(`Database "${dbName}" refreshed`, "info", 2000);
    } catch (err) {
      addToast(err instanceof Error ? err.message : String(err), "error");
    }
  };

  const handleRefreshCollection = async (dbName: string, colName: string) => {
    try {
      await reloadHierarchy();
      setCollectionRefreshKey((prev) => prev + 1);
      addToast(`Collection "${dbName}.${colName}" refreshed`, "info", 2000);
    } catch (err) {
      addToast(err instanceof Error ? err.message : String(err), "error");
    }
  };

  const handleRunRestore = async (config: RestoreConfig) => {
    const execute = async () => {
      try {
        const res = await runRestore(config);
        addToast(
          res.message || `Restore completed successfully into ${config.database}!`,
          "success"
        );
        await reloadHierarchy();
      } catch (err) {
        addToast(err instanceof Error ? err.message : String(err), "error", 5000);
        throw err;
      }
    };

    if (config.drop_existing && isProduction) {
      triggerProductionGuard(
        "Drop & Restore Database",
        config.database,
        execute
      );
    } else {
      await execute();
    }
  };

  const handleRunExport = async (config: ExportConfig) => {
    try {
      const res = await runExport(config);
      addToast(
        res.message || `Export completed successfully for ${config.collection}!`,
        "success"
      );
    } catch (err) {
      addToast(err instanceof Error ? err.message : String(err), "error", 5000);
      throw err;
    }
  };

  const handleRunImport = async (config: ImportConfig) => {
    const execute = async () => {
      try {
        const res = await runImport(config);
        addToast(
          res.message || `Import completed successfully for ${config.collection}!`,
          "success"
        );
        reloadHierarchy();
      } catch (err) {
        addToast(err instanceof Error ? err.message : String(err), "error", 5000);
        throw err;
      }
    };

    if (isProduction) {
      triggerProductionGuard(
        "Bulk Data Ingestion",
        `${config.database}.${config.collection}`,
        execute
      );
    } else {
      await execute();
    }
  };

  const handleCreateDatabase = async (dbName: string, colName: string) => {
    const conn = createDbModal.conn || activeConnection;
    if (!conn) return;
    try {
      await insertDocument(conn.id, dbName, colName, {
        description: "Initial record created with database",
        createdAt: new Date().toISOString(),
      });
      await reloadHierarchy();
      setSelectedDb(dbName);
      setSelectedCollection(colName);
      addToast(`Database '${dbName}' created successfully!`, "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : String(err), "error", 5000);
      throw err;
    }
  };

  // Available collections list for active database
  const targetDbName = backupModal.db || selectedDb;
  const activeDbInfo = hierarchy.find((d) => d.name === targetDbName);
  const availableCollections = activeDbInfo
    ? activeDbInfo.collections.map((c) => c.name)
    : [];

  return (
    <div className="relative h-full w-full flex flex-col bg-canvas text-gray-200 select-none overflow-hidden font-sans">
      {/* Main Layout: Sidebar + Workspace */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          connections={connections}
          activeConnection={activeConnection}
          connectingConnId={connectingConnId}
          onSelectConnection={handleSelectConnection}
          onDisconnectConnection={handleDisconnectConnection}
          onOpenNewConnection={handleOpenNewConn}
          onOpenSettings={() => setIsSettingsOpen(true)}
          hierarchy={hierarchy}
          selectedDb={selectedDb}
          selectedCollection={selectedCollection}
          onSelectCollection={handleSelectCollection}
          onOpenBackupModal={(db, col) =>
            setBackupModal({ isOpen: true, db, col })
          }
          onOpenRestoreModal={(db) => setRestoreModal({ isOpen: true, db })}
          onOpenExportModal={(db, col) =>
            setExportModal({ isOpen: true, db, col })
          }
          onOpenImportModal={(db, col) =>
            setImportModal({ isOpen: true, db, col })
          }
          onOpenUserManagement={(db) => setUserMgmtModal({ isOpen: true, db })}
          onCreateDatabase={(conn) => setCreateDbModal({ isOpen: true, conn })}
          onRefreshConnection={handleRefreshConnection}
          onRefreshDatabase={handleRefreshDatabase}
          onRefreshCollection={handleRefreshCollection}
          onEditConnection={(conn) => {
            setEditingConn(conn);
            setIsConnModalOpen(true);
          }}
          onDeleteConnection={(id) => removeProfile(id)}
        />

        <main className="flex-1 flex flex-col min-w-0 bg-canvas overflow-hidden">
          {/* Multi-Tab Workspace Bar */}
          {tabs.length > 0 && (
            <div className="h-9 bg-panel border-b border-hairline flex items-center px-2 gap-1 overflow-x-auto shrink-0 select-none">
              {tabs.map((tab) => {
                const isActive = activeTabId === tab.id;
                return (
                  <div
                    key={tab.id}
                    data-testid="workspace-tab"
                    onClick={() => handleSwitchTab(tab)}
                    className={`h-7 px-2.5 rounded flex items-center gap-2 text-xs font-mono cursor-pointer transition-colors ${
                      isActive
                        ? "bg-surface text-white border border-hairline shadow-sm"
                        : "text-gray-400 hover:text-gray-200 hover:bg-surface/50 border border-transparent"
                    }`}
                  >
                    <FileText
                      className={`w-3.5 h-3.5 ${
                        isActive ? "text-mongo" : "text-gray-500"
                      }`}
                    />
                    <span className="truncate max-w-[140px]">
                      <span className="text-gray-500">{tab.database}.</span>
                      <span className="font-semibold">{tab.title}</span>
                    </span>
                    <button
                      onClick={(e) => handleCloseTab(tab.id, e)}
                      className="p-0.5 rounded hover:bg-panel text-gray-500 hover:text-white"
                      title="Close Tab"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {selectedDb && selectedCollection ? (
            <CollectionWorkspace
              key={`${selectedDb}.${selectedCollection}.${collectionRefreshKey}`}
              connectionId={activeConnection?.id || null}
              database={selectedDb}
              collection={selectedCollection}
              isProduction={isProduction}
              onRequireProductionConfirm={triggerProductionGuard}
              onOpenBackup={(db, col) =>
                setBackupModal({ isOpen: true, db, col })
              }
              onOpenRestore={(db) =>
                setRestoreModal({ isOpen: true, db })
              }
              onOpenExport={(db, col) =>
                setExportModal({ isOpen: true, db, col })
              }
              onOpenImport={(db, col) =>
                setImportModal({ isOpen: true, db, col })
              }
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-canvas">
              <div className="w-14 h-14 rounded-2xl bg-panel border border-hairline flex items-center justify-center text-mongo mb-4 shadow-sm">
                {connectingConnId ? (
                  <Loader2 className="w-7 h-7 text-mongo animate-spin" />
                ) : (
                  <Database className="w-7 h-7" />
                )}
              </div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                {connectingConnId
                  ? "Connecting to Database..."
                  : activeConnection
                  ? `Connected to ${activeConnection.name}`
                  : "No Active Connection"}
              </h2>
              <p className="text-xs text-gray-400 max-w-md mt-1.5 leading-relaxed">
                {connectingConnId
                  ? "Establishing network connection and discovering database hierarchy..."
                  : activeConnection
                  ? "Select a collection from the Object Explorer on the left to inspect documents, manage indexes, or analyze schema distributions."
                  : "Create or choose a MongoDB connection profile to begin exploring your databases."}
              </p>

              <div className="mt-5 flex items-center gap-2.5">
                <button
                  onClick={handleOpenNewConn}
                  className="px-3.5 py-1.5 rounded-md bg-mongo hover:bg-emerald-600 text-xs font-semibold text-gray-950 flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Connection</span>
                </button>
              </div>

              {/* Real Connection Status Diagnostic */}
              {activeConnection && hierarchy.length === 0 && (
                <div className="mt-6 p-4 bg-panel border border-hairline rounded-xl max-w-md w-full text-left space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-300">
                      Connection Status
                    </span>
                    <button
                      onClick={() => testPing(activeConnection.uri)}
                      className="text-[11px] font-mono text-mongo hover:text-emerald-400"
                    >
                      Ping Server
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 font-mono">
                    Target: {activeConnection.uri}
                  </p>
                  {pingResult && (
                    <div
                      className={`p-2 rounded text-xs font-mono border ${
                        pingResult.success
                          ? "bg-mongo/10 border-mongo/30 text-emerald-300"
                          : "bg-guard/10 border-guard/30 text-red-300"
                      }`}
                    >
                      {pingResult.success
                        ? `Online: Ping latency ${pingResult.latency_ms}ms (${pingResult.server_version || "MongoDB"})`
                        : `Offline: ${pingResult.error || "Cannot connect to server"}`}
                    </div>
                  )}
                </div>
              )}

              {/* Quick collection hints if connected */}
              {hierarchy.length > 0 && (
                <div className="mt-8 p-4 bg-panel border border-hairline rounded-xl max-w-lg w-full text-left space-y-2">
                  <div className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-mongo" />
                    <span>Available Databases & Collections</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    {hierarchy.slice(0, 4).map((d) => (
                      <div
                        key={d.name}
                        className="p-2 rounded bg-surface/50 border border-hairline/60"
                      >
                        <div className="text-white font-medium truncate">
                          {d.name}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {d.collections.length} collections
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Settings Modal (CLI Engine, Storage, Preferences) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        tools={tools}
        onEnsureTool={ensureTool}
        onCheckVersion={checkVersion}
        versionOutputs={versionOutputs}
        isDownloading={isDownloading}
      />

      {/* Connection Modal (New / Edit) */}
      <ConnectionModal
        isOpen={isConnModalOpen}
        onClose={() => setIsConnModalOpen(false)}
        onSave={saveProfile}
        onTestPing={testPing}
        initialProfile={editingConn}
      />

      {/* Backup / Dump Action Modal */}
      <BackupModal
        isOpen={backupModal.isOpen}
        onClose={() =>
          setBackupModal((prev) => ({ ...prev, isOpen: false }))
        }
        onRunBackup={handleRunBackup}
        onEnsureTool={ensureTool}
        connectionId={activeConnection?.id || ""}
        defaultDb={backupModal.db || selectedDb || "store_db"}
        availableCollections={
          hierarchy
            .find((d) => d.name === (backupModal.db || selectedDb))
            ?.collections.map((c) => c.name) || availableCollections
        }
        availableDatabases={hierarchy.map((d) => d.name)}
        onDatabaseChange={(db) => setBackupModal((prev) => ({ ...prev, db }))}
      />

      {/* Restore Action Modal with File Explorer integration */}
      <RestoreModal
        isOpen={restoreModal.isOpen}
        onClose={() =>
          setRestoreModal((prev) => ({ ...prev, isOpen: false }))
        }
        onRunRestore={handleRunRestore}
        onInspectArchive={inspectArchive}
        onEnsureTool={ensureTool}
        connectionId={activeConnection?.id || ""}
        defaultDb={restoreModal.db || selectedDb || "store_db"}
        isProduction={isProduction}
      />

      {/* Export Wizard Action Modal */}
      <ExportModal
        isOpen={exportModal.isOpen}
        onClose={() =>
          setExportModal((prev) => ({ ...prev, isOpen: false }))
        }
        onRunExport={handleRunExport}
        onEnsureTool={ensureTool}
        connectionId={activeConnection?.id || ""}
        database={exportModal.db || selectedDb || "store_db"}
        collection={exportModal.col || selectedCollection || "orders"}
      />

      {/* Import Wizard Action Modal */}
      <ImportModal
        isOpen={importModal.isOpen}
        onClose={() =>
          setImportModal((prev) => ({ ...prev, isOpen: false }))
        }
        onRunImport={handleRunImport}
        onPreviewFile={previewImportFile}
        onEnsureTool={ensureTool}
        connectionId={activeConnection?.id || ""}
        database={importModal.db || selectedDb || "store_db"}
        collection={importModal.col || selectedCollection || "orders"}
        isProduction={isProduction}
      />

      {/* User Management Modal */}
      <UserManagementModal
        isOpen={userMgmtModal.isOpen}
        onClose={() => setUserMgmtModal({ isOpen: false, db: "" })}
        connectionId={activeConnection?.id || ""}
        database={userMgmtModal.db || selectedDb || "admin"}
        availableDatabases={hierarchy.map((d) => d.name)}
        isProduction={isProduction}
      />

      {/* Create Database Modal */}
      <CreateDatabaseModal
        isOpen={createDbModal.isOpen}
        onClose={() => setCreateDbModal({ isOpen: false, conn: null })}
        connectionName={createDbModal.conn?.name || activeConnection?.name || "MongoDB"}
        onCreate={handleCreateDatabase}
      />

      {/* Production Guard Multi-Step Confirmation Modal */}
      <ProductionGuardModal
        isOpen={guardState.isOpen}
        onClose={() =>
          setGuardState((prev) => ({ ...prev, isOpen: false }))
        }
        actionName={guardState.actionName}
        entityName={guardState.entityName}
        onConfirmed={guardState.onConfirmed}
      />

      {/* Provisioning Progress Modal */}
      <ProvisioningModal isOpen={isDownloading} progress={activeDownload} />

      {/* Global Floating Toast Feedback */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default App;
