import React, { useState } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { EngineDashboard } from "./components/EngineDashboard";
import { ProvisioningModal } from "./components/ProvisioningModal";
import { useProvisioning } from "./hooks/useProvisioning";
import { Sparkles, Database, Layers, HardDriveDownload, Share2, Terminal } from "lucide-react";

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>("engine");

  const {
    tools,
    loading,
    isDownloading,
    activeDownload,
    versionOutputs,
    refreshTools,
    ensureTool,
    checkVersion,
  } = useProvisioning();

  const shellReady = tools.some((t) => t.bundle === "shell" && t.is_available);
  const toolsReady = tools.some((t) => t.bundle === "databasetools" && t.is_available);
  const activeCount = tools.filter((t) => t.is_available).length;

  return (
    <div className="h-screen w-screen flex flex-col bg-canvas text-gray-200 select-none overflow-hidden font-sans">
      {/* Top Application Header */}
      <Header
        onRefresh={refreshTools}
        isLoading={loading}
        activeCount={activeCount}
        totalCount={tools.length}
      />

      {/* Main Workspace: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          toolCounts={{ shellReady, toolsReady }}
        />

        <main className="flex-1 flex flex-col min-w-0 bg-canvas overflow-hidden">
          {currentTab === "engine" ? (
            <EngineDashboard
              tools={tools}
              loading={loading}
              onEnsureTool={ensureTool}
              onCheckVersion={checkVersion}
              versionOutputs={versionOutputs}
              isDownloading={isDownloading}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-canvas">
              <div className="w-12 h-12 rounded-xl bg-panel border border-hairline flex items-center justify-center text-mongo mb-4 shadow-sm">
                {currentTab === "connections" && <Database className="w-6 h-6" />}
                {currentTab === "documents" && <Layers className="w-6 h-6" />}
                {currentTab === "backup" && <HardDriveDownload className="w-6 h-6" />}
                {currentTab === "export" && <Share2 className="w-6 h-6" />}
                {currentTab === "console" && <Terminal className="w-6 h-6" />}
              </div>
              <h3 className="text-base font-semibold text-white tracking-tight capitalize">
                {currentTab} Workspace
              </h3>
              <p className="text-xs text-gray-400 max-w-md mt-1 leading-relaxed">
                This feature module is scheduled for implementation in Phase 2 through Phase 4 according to the project roadmap. The backend provisioning engine is ready.
              </p>
              <button
                onClick={() => setCurrentTab("engine")}
                className="mt-4 px-3 py-1.5 rounded-md bg-surface hover:bg-surface-hover text-xs font-medium text-mongo border border-hairline transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Return to Engine Dashboard</span>
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Modal for On-Demand Provisioning Progress */}
      <ProvisioningModal isOpen={isDownloading} progress={activeDownload} />
    </div>
  );
};

export default App;
