import React, { useState } from "react";
import { ToolStatus } from "../types";
import {
  Cpu,
  CheckCircle,
  AlertCircle,
  Download,
  Terminal,
  FolderOpen,
  Zap,
  Play,
} from "lucide-react";

interface EngineDashboardProps {
  tools: ToolStatus[];
  loading?: boolean;
  onEnsureTool: (name: string) => Promise<string>;
  onCheckVersion: (name: string) => Promise<void>;
  versionOutputs: Record<string, string>;
  isDownloading: boolean;
}

export const EngineDashboard: React.FC<EngineDashboardProps> = ({
  tools,
  loading: _loading,
  onEnsureTool,
  onCheckVersion,
  versionOutputs,
  isDownloading,
}) => {
  const [testingTool, setTestingTool] = useState<string | null>(null);

  const handleTest = async (name: string) => {
    setTestingTool(name);
    try {
      await onCheckVersion(name);
    } finally {
      setTestingTool(null);
    }
  };

  const toolDescriptions: Record<string, string> = {
    mongosh: "Interactive MongoDB JavaScript Shell and high-performance query evaluation engine.",
    mongodump: "Binary backup engine: dumps documents into compressed Gzip BSON archives.",
    mongorestore: "Recovery engine: parses archives and restores collections with schema safety.",
    mongoexport: "Data export engine: produces formatted JSON, CSV, and NDJSON datasets.",
    mongoimport: "Data ingestion wizard: parses and inserts CSV/JSON with schema auto-mapping.",
  };

  const shellTools = tools.filter((t) => t.bundle === "shell");
  const dbTools = tools.filter((t) => t.bundle === "databasetools");

  return (
    <div className="flex-1 bg-canvas overflow-y-auto p-6 space-y-6">
      {/* Top Banner: Architecture & JIT Engine Info */}
      <div className="bg-panel border border-hairline rounded-xl p-5 shadow-sm relative overflow-hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-md bg-mongo/10 text-mongo border border-mongo/20">
                <Cpu className="w-4 h-4" />
              </span>
              <h2 className="text-base font-semibold text-white tracking-tight">
                Official Engine Provisioning & Tooling Hub
              </h2>
            </div>
            <p className="text-xs text-gray-400 max-w-2xl leading-relaxed">
              Mongox uses a <strong className="text-gray-200">Just-in-Time (JIT) On-Demand</strong> provisioning model. Tool binaries are acquired the first time you execute a feature requiring them (or automatically re-acquired if deleted from disk), ensuring a lightweight zero-setup experience.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-gray-400 bg-surface px-3 py-1.5 rounded-lg border border-hairline shrink-0">
            <Zap className="w-3.5 h-3.5 text-mongo" />
            <span>Target: %LOCALAPPDATA%\Mongox\bin</span>
          </div>
        </div>
      </div>

      {/* Tool Groups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Group 1: MongoDB Shell Bundle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-mongo" />
              <h3 className="text-xs font-semibold text-gray-200 uppercase tracking-wider">
                Shell Engine Bundle
              </h3>
            </div>
            <span className="text-[11px] text-gray-400 font-mono">
              Used by Query Explorer & Console
            </span>
          </div>

          <div className="space-y-3">
            {shellTools.map((tool) => (
              <ToolCard
                key={tool.name}
                tool={tool}
                description={toolDescriptions[tool.name]}
                onEnsure={onEnsureTool}
                onTest={handleTest}
                isTesting={testingTool === tool.name}
                versionOutput={versionOutputs[tool.name]}
                isDownloading={isDownloading}
              />
            ))}
          </div>
        </div>

        {/* Group 2: Database Tools Bundle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-gray-200 uppercase tracking-wider">
                Database Tools Bundle
              </h3>
            </div>
            <span className="text-[11px] text-gray-400 font-mono">
              Used by Backup, Restore, Export, Import
            </span>
          </div>

          <div className="space-y-3">
            {dbTools.map((tool) => (
              <ToolCard
                key={tool.name}
                tool={tool}
                description={toolDescriptions[tool.name]}
                onEnsure={onEnsureTool}
                onTest={handleTest}
                isTesting={testingTool === tool.name}
                versionOutput={versionOutputs[tool.name]}
                isDownloading={isDownloading}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface ToolCardProps {
  tool: ToolStatus;
  description: string;
  onEnsure: (name: string) => Promise<string>;
  onTest: (name: string) => Promise<void>;
  isTesting: boolean;
  versionOutput?: string;
  isDownloading: boolean;
}

const ToolCard: React.FC<ToolCardProps> = ({
  tool,
  description,
  onEnsure,
  onTest,
  isTesting,
  versionOutput,
  isDownloading,
}) => {
  return (
    <div className="bg-panel border border-hairline rounded-xl p-4 shadow-sm hover:border-hairline/80 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-surface border border-hairline">
            {tool.is_available ? (
              <CheckCircle className="w-4 h-4 text-mongo" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white font-mono tracking-tight">
                {tool.name}
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                  tool.is_available
                    ? "bg-mongo/10 text-mongo border-mongo/20"
                    : "bg-amber-400/10 text-amber-300 border-amber-400/20"
                }`}
              >
                {tool.is_available
                  ? tool.source === "system_path"
                    ? "System PATH"
                    : "App Bin"
                  : "On-Demand JIT"}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Action button */}
        <div className="shrink-0 flex items-center gap-2">
          {tool.is_available ? (
            <button
              onClick={() => onTest(tool.name)}
              disabled={isTesting}
              className="px-2.5 py-1 rounded bg-surface hover:bg-surface-hover text-xs font-mono text-gray-300 border border-hairline flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Execute --version test"
            >
              <Play className={`w-3 h-3 ${isTesting ? "animate-spin text-mongo" : ""}`} />
              <span>{isTesting ? "Running..." : "Test Run"}</span>
            </button>
          ) : (
            <button
              onClick={() => onEnsure(tool.name)}
              disabled={isDownloading}
              className="px-2.5 py-1 rounded bg-mongo/10 hover:bg-mongo/20 text-xs font-mono text-mongo border border-mongo/30 flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
              title="Download official bundle from MongoDB CDN"
            >
              <Download className="w-3 h-3" />
              <span>Download</span>
            </button>
          )}
        </div>
      </div>

      {/* Path information */}
      {tool.path && (
        <div className="mt-2 text-[11px] font-mono text-gray-400 bg-surface/50 border border-hairline/60 rounded px-2.5 py-1 truncate">
          <span className="text-gray-400">Path: </span>
          <span className="text-gray-200">{tool.path}</span>
        </div>
      )}

      {/* Version execution test output */}
      {versionOutput && (
        <div className="mt-2 text-[11px] font-mono p-2 bg-canvas border border-hairline rounded text-mongo whitespace-pre-wrap">
          {versionOutput}
        </div>
      )}
    </div>
  );
};
