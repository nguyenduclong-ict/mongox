import React, { useState } from "react";
import { ToolStatus } from "../types";
import {
  Settings,
  X,
  Cpu,
  Sliders,
  CheckCircle,
  AlertCircle,
  Download,
  Play,
  Info,
} from "lucide-react";
import { Tabs } from "./ui/Tabs";

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
  const [activeTab, setActiveTab] = useState<"engine" | "preferences">("engine");
  const [testingTool, setTestingTool] = useState<string | null>(null);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-modal border border-hairline rounded-xl shadow-modal text-gray-200 overflow-hidden flex flex-col h-[75vh] max-h-[85vh] font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-hairline flex items-center justify-between shrink-0 bg-modal">
          <div className="flex items-center gap-3">
            <Settings className="w-4 h-4 text-mongo shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Application Settings
              </h2>
              <p className="text-[12px] text-gray-400 font-normal mt-0.5">
                Manage CLI engines, local storage paths, and query preferences
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-md hover:bg-white/[0.06] text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <Tabs<"engine" | "preferences">
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: "engine", label: "CLI Engine & Tooling", icon: Cpu },
            { id: "preferences", label: "Preferences", icon: Sliders },
          ]}
        />

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === "engine" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-surface/50 border border-hairline text-xs text-gray-400 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-mongo shrink-0 mt-0.5" />
                <span>
                  Official MongoDB command-line utilities are automatically discovered or provisioned on demand. Binaries are stored in user-isolated application storage.
                </span>
              </div>

              <div className="space-y-2">
                {tools.map((tool) => (
                  <div
                    key={tool.name}
                    className="p-3 bg-surface/40 border border-hairline rounded-lg flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {tool.is_available ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold text-white">
                            {tool.name}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
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
                          <div className="text-[10px] font-mono text-gray-500 truncate max-w-sm mt-0.5">
                            {tool.path}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {tool.is_available ? (
                        <button
                          onClick={() => handleTest(tool.name)}
                          disabled={testingTool === tool.name}
                          className="px-2.5 py-1 rounded-md bg-surface hover:bg-surface-hover text-xs font-mono text-gray-300 border border-hairline flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          <Play className={`w-3 h-3 ${testingTool === tool.name ? "animate-spin text-mongo" : ""}`} />
                          <span>{testingTool === tool.name ? "Testing..." : "Test"}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onEnsureTool(tool.name)}
                          disabled={isDownloading}
                          className="px-2.5 py-1 rounded-md bg-mongo hover:bg-emerald-600 text-xs font-semibold text-gray-950 flex items-center gap-1.5 transition-colors disabled:opacity-50"
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

          {activeTab === "preferences" && (
            <div className="space-y-4">
              <div className="p-4 bg-surface/40 border border-hairline rounded-xl space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    Default Query Result Limit
                  </label>
                  <p className="text-[11px] text-gray-400 mb-2 font-normal">
                    Controls maximum document batch size fetched per page in Document Explorer.
                  </p>
                  <select
                    defaultValue="50"
                    className="px-3 py-1.5 bg-surface border border-hairline rounded-md text-xs font-mono text-white focus:outline-none focus:border-mongo cursor-pointer"
                  >
                    <option value="20" className="bg-modal text-white">20 documents</option>
                    <option value="50" className="bg-modal text-white">50 documents (Recommended)</option>
                    <option value="100" className="bg-modal text-white">100 documents</option>
                    <option value="500" className="bg-modal text-white">500 documents</option>
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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-hairline bg-panel flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-surface hover:bg-white/[0.08] text-xs font-medium text-gray-200 border border-hairline transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
