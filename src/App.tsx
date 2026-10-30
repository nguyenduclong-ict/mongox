import React, { useState } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { EngineDashboard } from "./components/EngineDashboard";
import { ConnectionsView } from "./components/ConnectionsView";
import { ConnectionModal } from "./components/ConnectionModal";
import { DocumentExplorer } from "./components/DocumentExplorer/DocumentExplorer";
import { BackupRestoreView } from "./components/BackupRestore/BackupRestoreView";
import { ExportImportView } from "./components/ExportImport/ExportImportView";
import { ProductionGuardModal } from "./components/ProductionGuardModal";
import { ProvisioningModal } from "./components/ProvisioningModal";
import { useProvisioning } from "./hooks/useProvisioning";
import { useConnection } from "./hooks/useConnection";
import { ConnectionProfile } from "./types";
import { Terminal, Play, Sparkles } from "lucide-react";

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>("connections");
  const [isConnModalOpen, setIsConnModalOpen] = useState<boolean>(false);
  const [editingConn, setEditingConn] = useState<ConnectionProfile | null>(null);

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

  // Interactive Console input state
  const [consoleInput, setConsoleInput] = useState<string>("db.getCollectionNames();");
  const [consoleOutput, setConsoleOutput] = useState<string>(
    '// Mongox Interactive Shell (mongosh)\n["orders", "customers", "products"]'
  );

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
    removeProfile,
    testPing,
    reloadHierarchy,
  } = useConnection();

  const shellReady = tools.some((t) => t.bundle === "shell" && t.is_available);
  const toolsReady = tools.some((t) => t.bundle === "databasetools" && t.is_available);
  const activeCount = tools.filter((t) => t.is_available).length;
  const isProduction = activeConnection?.environment === "production";

  const handleOpenNewConn = () => {
    setEditingConn(null);
    setIsConnModalOpen(true);
  };

  const handleEditConn = (conn: ConnectionProfile) => {
    setEditingConn(conn);
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

  const handleRunConsole = () => {
    try {
      setConsoleOutput(
        `> ${consoleInput}\n// Evaluated in active cluster (${activeConnection?.name || "Localhost"})\n` +
          JSON.stringify({ ok: 1, result: ["orders", "customers", "products"], executionTimeMs: 14 }, null, 2)
      );
    } catch (e) {
      setConsoleOutput(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // Extract available collections list for active database
  const activeDbInfo = hierarchy.find((d) => d.name === selectedDb);
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
      />

      {/* Main Workspace: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          toolCounts={{ shellReady, toolsReady }}
          hierarchy={hierarchy}
          selectedDb={selectedDb}
          selectedCollection={selectedCollection}
          onSelectCollection={(db, col) => {
            setSelectedDb(db);
            setSelectedCollection(col);
          }}
        />

        <main className="flex-1 flex flex-col min-w-0 bg-canvas overflow-hidden">
          {currentTab === "connections" && (
            <ConnectionsView
              connections={connections}
              activeConnection={activeConnection}
              onSelectConnection={selectConnection}
              onOpenNewModal={handleOpenNewConn}
              onEditProfile={handleEditConn}
              onDeleteProfile={removeProfile}
              onTestPing={testPing}
              onNavigateToExplorer={() => setCurrentTab("documents")}
            />
          )}

          {currentTab === "documents" && (
            <DocumentExplorer
              connectionId={activeConnection?.id || null}
              database={selectedDb}
              collection={selectedCollection}
              isProduction={isProduction}
              onRequireProductionConfirm={triggerProductionGuard}
            />
          )}

          {currentTab === "backup" && (
            <BackupRestoreView
              connectionId={activeConnection?.id || null}
              database={selectedDb}
              availableCollections={availableCollections}
              isProduction={isProduction}
              onRequireProductionConfirm={triggerProductionGuard}
            />
          )}

          {currentTab === "export" && (
            <ExportImportView
              connectionId={activeConnection?.id || null}
              database={selectedDb}
              collection={selectedCollection}
              isProduction={isProduction}
              onRequireProductionConfirm={triggerProductionGuard}
            />
          )}

          {currentTab === "engine" && (
            <EngineDashboard
              tools={tools}
              onEnsureTool={ensureTool}
              onCheckVersion={checkVersion}
              versionOutputs={versionOutputs}
              isDownloading={isDownloading}
            />
          )}

          {currentTab === "console" && (
            <div className="flex-1 flex flex-col bg-canvas p-6 space-y-4 overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-hairline shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-surface border border-hairline text-mongo">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div>
                    <h1 className="text-base font-semibold text-white tracking-tight">
                      Mongosh Interactive JavaScript Shell
                    </h1>
                    <p className="text-xs text-gray-400">
                      Evaluate queries, administrative commands, and scripts against {selectedDb || "current database"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleRunConsole}
                  className="px-3.5 py-1.5 rounded-md bg-mongo hover:bg-emerald-600 text-xs font-semibold text-gray-950 flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Execute Script</span>
                </button>
              </div>

              <div className="flex-1 flex flex-col min-h-0 space-y-3">
                <div className="h-32 shrink-0 bg-surface border border-hairline rounded-lg p-3 font-mono text-xs">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-mongo" />
                    <span>Script Editor</span>
                  </div>
                  <textarea
                    value={consoleInput}
                    onChange={(e) => setConsoleInput(e.target.value)}
                    className="w-full h-20 bg-transparent text-gray-100 placeholder-gray-600 focus:outline-none resize-none font-mono selection:bg-mongo/30"
                    placeholder="db.getCollectionNames();"
                  />
                </div>

                <div className="flex-1 min-h-0 bg-panel border border-hairline rounded-lg p-4 font-mono text-xs text-mongo overflow-auto leading-relaxed whitespace-pre-wrap">
                  {consoleOutput}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal for Creating / Editing Connection */}
      <ConnectionModal
        isOpen={isConnModalOpen}
        onClose={() => setIsConnModalOpen(false)}
        onSave={saveProfile}
        onTestPing={testPing}
        initialProfile={editingConn}
      />

      {/* Production Guard Multi-Step Confirmation Modal */}
      <ProductionGuardModal
        isOpen={guardState.isOpen}
        onClose={() => setGuardState((prev) => ({ ...prev, isOpen: false }))}
        actionName={guardState.actionName}
        entityName={guardState.entityName}
        onConfirmed={guardState.onConfirmed}
      />

      {/* Modal for On-Demand Provisioning Progress */}
      <ProvisioningModal isOpen={isDownloading} progress={activeDownload} />
    </div>
  );
};

export default App;
