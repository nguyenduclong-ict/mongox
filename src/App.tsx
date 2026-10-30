import React, { useState } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { CollectionWorkspace } from "./components/CollectionWorkspace/CollectionWorkspace";
import { ConnectionModal } from "./components/ConnectionModal";
import { SettingsModal } from "./components/SettingsModal";
import { BackupModal } from "./components/BackupRestore/BackupModal";
import { RestoreModal } from "./components/BackupRestore/RestoreModal";
import { ExportModal } from "./components/ExportImport/ExportModal";
import { ImportModal } from "./components/ExportImport/ImportModal";
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
} from "./services/tauri";
import { Database, Plus, Sparkles, Layers } from "lucide-react";

export const App: React.FC = () => {
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

  const {
    tools,
    loading: toolsLoading,
    isDownloading,
    activeDownload,
    versionOutputs,
    refreshTools,
    ensureTool,
    checkVersion,
  } = useProvisioning();

  const {
    connections,
    activeConnection,
    hierarchy,
    selectedDb,
    selectedCollection,
    pingResult,
    setSelectedDb,
    setSelectedCollection,
    selectConnection,
    saveProfile,
    testPing,
    reloadHierarchy,
  } = useConnection();

  const activeCount = tools.filter((t) => t.is_available).length;
  const isProduction = activeConnection?.environment === "production";

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
    await runBackup(config);
  };

  const handleRunRestore = async (config: RestoreConfig) => {
    const execute = async () => {
      await runRestore(config);
      reloadHierarchy();
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
    await runExport(config);
  };

  const handleRunImport = async (config: ImportConfig) => {
    const execute = async () => {
      await runImport(config);
      reloadHierarchy();
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

  // Available collections list for active database
  const activeDbInfo = hierarchy.find((d) => d.name === (selectedDb || backupModal.db));
  const availableCollections = activeDbInfo
    ? activeDbInfo.collections.map((c) => c.name)
    : ["orders", "customers", "products"];

  return (
    <div className="h-screen w-screen flex flex-col bg-canvas text-gray-200 select-none overflow-hidden font-sans">
      {/* Top Application Header */}
      <Header
        onRefresh={() => {
          refreshTools();
          reloadHierarchy();
        }}
        isLoading={toolsLoading}
        activeCount={activeCount}
        totalCount={tools.length}
        activeConnection={activeConnection}
        activeDatabase={selectedDb}
        activeCollection={selectedCollection}
        latencyMs={pingResult?.latency_ms}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Layout: Object Explorer Sidebar + Collection Workspace */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          connections={connections}
          activeConnection={activeConnection}
          onSelectConnection={selectConnection}
          onOpenNewConnection={handleOpenNewConn}
          onOpenSettings={() => setIsSettingsOpen(true)}
          hierarchy={hierarchy}
          selectedDb={selectedDb}
          selectedCollection={selectedCollection}
          onSelectCollection={(db, col) => {
            setSelectedDb(db);
            setSelectedCollection(col);
          }}
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
        />

        <main className="flex-1 flex flex-col min-w-0 bg-canvas overflow-hidden">
          {selectedDb && selectedCollection ? (
            <CollectionWorkspace
              connectionId={activeConnection?.id || null}
              database={selectedDb}
              collection={selectedCollection}
              isProduction={isProduction}
              onRequireProductionConfirm={triggerProductionGuard}
              onOpenBackup={(db, col) =>
                setBackupModal({ isOpen: true, db, col })
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
                <Database className="w-7 h-7" />
              </div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                {activeConnection
                  ? `Connected to ${activeConnection.name}`
                  : "No Active Connection"}
              </h2>
              <p className="text-xs text-gray-400 max-w-md mt-1.5 leading-relaxed">
                {activeConnection
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

                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-3 py-1.5 rounded-md bg-surface hover:bg-surface-hover text-xs font-medium text-gray-300 border border-hairline flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-mongo" />
                  <span>Settings & CLI Tools</span>
                </button>
              </div>

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
        connectionId={activeConnection?.id || ""}
        defaultDb={backupModal.db || selectedDb || "store_db"}
        availableCollections={availableCollections}
      />

      {/* Restore Action Modal with File Explorer integration */}
      <RestoreModal
        isOpen={restoreModal.isOpen}
        onClose={() =>
          setRestoreModal((prev) => ({ ...prev, isOpen: false }))
        }
        onRunRestore={handleRunRestore}
        onInspectArchive={inspectArchive}
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
        connectionId={activeConnection?.id || ""}
        database={importModal.db || selectedDb || "store_db"}
        collection={importModal.col || selectedCollection || "orders"}
        isProduction={isProduction}
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
    </div>
  );
};

export default App;
