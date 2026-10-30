import React, { useState, useEffect } from "react";
import { ToolStatus } from "../types";
import {
  Settings,
  X,
  Cpu,
  Folder,
  Sliders,
  CheckCircle,
  AlertCircle,
  Download,
  Play,
  ExternalLink,
  Shield,
  Sparkles,
} from "lucide-react";
import { getDefaultBackupDir, openBackupDirectory } from "../services/tauri";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tools: ToolStatus[];
  onEnsureTool: (name: string) => Promise<string>;
  onCheckVersion: (name: string) => Promise<void>;
  versionOutputs: Record<string, string>;
  isDownloading: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  tools,
  onEnsureTool,
  onCheckVersion,
  versionOutputs,
  isDownloading,
}) => {
  const [activeTab, setActiveTab] = useState<"engine" | "storage" | "preferences">("engine");
  const [backupDir, setBackupDir] = useState<string>("");
  const [testingTool, setTestingTool] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getDefaultBackupDir().then(setBackupDir);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async (name: string) => {
    setTestingTool(name);
    try {
      await onCheckVersion(name);
    } finally {
      setTestingTool(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-modal border border-white/10 rounded-xl shadow-modal text-gray-200 overflow-hidden flex flex-col h-[80vh]">
        {/* Header */}
        <div className="h-14 px-6 border-b border-hairline flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-surface border border-hairline text-mongo">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Mongox Application Settings
              </h2>
              <p className="text-[11px] text-gray-400">
                Manage CLI engines, local storage paths, and query preferences
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-surface text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex px-6 border-b border-hairline bg-panel shrink-0 gap-6 text-xs font-medium">
          <button
            onClick={() => setActiveTab("engine")}
            className={`py-3 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "engine"
                ? "border-mongo text-white font-semibold"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>CLI Engine & Tooling</span>
          </button>

          <button
            onClick={() => setActiveTab("storage")}
            className={`py-3 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "storage"
                ? "border-mongo text-white font-semibold"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Storage & Directories</span>
          </button>

          <button
            onClick={() => setActiveTab("preferences")}
            className={`py-3 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "preferences"
                ? "border-mongo text-white font-semibold"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Preferences</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === "engine" && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-surface/50 border border-hairline text-xs text-gray-400 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-mongo shrink-0 mt-0.5" />
                <span>
                  Official MongoDB command-line utilities are automatically discovered or provisioned on demand. Binaries are stored in user-isolated application storage.
                </span>
              </div>

              <div className="space-y-2.5">
                {tools.map((tool) => (
                  <div
                    key={tool.name}
                    className="p-3 bg-panel border border-hairline rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1 rounded bg-surface border border-hairline">
                        {tool.is_available ? (
                          <CheckCircle className="w-3.5 h-3.5 text-mongo" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold text-white">
                            {tool.name}
                          </span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                              tool.is_available
                                ? "bg-mongo/10 text-mongo border-mongo/30"
                                : "bg-amber-400/10 text-amber-400 border-amber-400/30"
                            }`}
                          >
                            {tool.is_available
                              ? tool.source === "system_path"
                                ? "PATH"
                                : "Local Bin"
                              : "Missing"}
                          </span>
                        </div>
                        {tool.path && (
                          <div className="text-[10px] font-mono text-gray-500 truncate max-w-sm">
                            {tool.path}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {tool.is_available ? (
                        <button
                          onClick={() => handleTest(tool.name)}
                          disabled={testingTool === tool.name}
                          className="px-2 py-1 rounded bg-surface hover:bg-surface-hover text-[11px] font-mono text-gray-300 border border-hairline flex items-center gap-1 transition-colors disabled:opacity-50"
                        >
                          <Play className={`w-3 h-3 ${testingTool === tool.name ? "animate-spin text-mongo" : ""}`} />
                          <span>{testingTool === tool.name ? "Testing..." : "Test"}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onEnsureTool(tool.name)}
                          disabled={isDownloading}
                          className="px-2 py-1 rounded bg-mongo/10 hover:bg-mongo/20 text-[11px] font-mono text-mongo border border-mongo/30 flex items-center gap-1 transition-colors disabled:opacity-50"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {Object.keys(versionOutputs).length > 0 && (
                <div className="p-3 bg-canvas border border-hairline rounded-lg space-y-1 font-mono text-[11px]">
                  <div className="text-gray-500 font-semibold uppercase text-[10px]">
                    CLI Output Log
                  </div>
                  {Object.entries(versionOutputs).map(([name, out]) => (
                    <div key={name} className="text-gray-300">
                      <span className="text-mongo">{name}: </span>
                      <span>{out}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "storage" && (
            <div className="space-y-4">
              <div className="p-4 bg-panel border border-hairline rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-white">Default Backup Storage</h3>
                    <p className="text-[11px] text-gray-400">
                      Snapshots generated by mongodump are saved here by default.
                    </p>
                  </div>
                  <button
                    onClick={() => openBackupDirectory()}
                    className="px-3 py-1.5 rounded-md bg-surface hover:bg-surface-hover text-xs font-medium text-mongo border border-hairline flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Explorer</span>
                  </button>
                </div>

                <div className="p-2.5 bg-surface border border-hairline rounded-md text-xs font-mono text-gray-300 select-all">
                  {backupDir || "Resolving directory..."}
                </div>
              </div>

              <div className="p-4 bg-panel border border-hairline rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Shield className="w-4 h-4 text-mongo" />
                  <span>File Isolation & Privacy</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Backups, configuration files, and downloaded CLI engines are kept strictly within your user profile directory. No administrative privileges or system-wide modifications are made.
                </p>
              </div>
            </div>
          )}

          {activeTab === "preferences" && (
            <div className="space-y-4">
              <div className="p-4 bg-panel border border-hairline rounded-xl space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    Default Query Result Limit
                  </label>
                  <p className="text-[11px] text-gray-400 mb-2">
                    Controls maximum document batch size fetched per page in Document Explorer.
                  </p>
                  <select
                    defaultValue="50"
                    className="px-3 py-1.5 bg-surface border border-hairline rounded-md text-xs font-mono text-white focus:outline-none focus:border-mongo"
                  >
                    <option value="20">20 documents</option>
                    <option value="50">50 documents (Recommended)</option>
                    <option value="100">100 documents</option>
                    <option value="500">500 documents</option>
                  </select>
                </div>

                <div className="pt-3 border-t border-hairline">
                  <label className="block text-xs font-semibold text-white mb-1">
                    Design Theme
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-canvas border border-hairline" />
                    <span className="text-xs font-medium text-gray-300">
                      Linear Dark-Tech (Obsidian #08090A with Mongo Emerald #10B981)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
