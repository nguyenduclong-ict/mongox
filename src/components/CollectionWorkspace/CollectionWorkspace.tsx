import React, { useState } from "react";
import { DocumentExplorer } from "../DocumentExplorer/DocumentExplorer";
import { IndexManager } from "./IndexManager";
import { SchemaAnalyzer } from "./SchemaAnalyzer";
import {
  Layers,
  Zap,
  BarChart3,
  HardDriveDownload,
  Share2,
  Upload,
} from "lucide-react";

interface CollectionWorkspaceProps {
  connectionId: string | null;
  database: string | null;
  collection: string | null;
  isProduction?: boolean;
  onRequireProductionConfirm?: (
    actionName: string,
    entityName: string,
    onConfirmed: () => Promise<void>
  ) => void;
  onOpenBackup: (db: string, col: string) => void;
  onOpenExport: (db: string, col: string) => void;
  onOpenImport: (db: string, col: string) => void;
}

export const CollectionWorkspace: React.FC<CollectionWorkspaceProps> = ({
  connectionId,
  database,
  collection,
  isProduction,
  onRequireProductionConfirm,
  onOpenBackup,
  onOpenExport,
  onOpenImport,
}) => {
  const [activeTab, setActiveTab] = useState<"documents" | "indexes" | "schema">("documents");

  if (!connectionId || !database || !collection) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-canvas">
        <div className="w-12 h-12 rounded-xl bg-panel border border-hairline flex items-center justify-center text-mongo mb-3">
          <Layers className="w-6 h-6" />
        </div>
        <h2 className="text-sm font-semibold text-white tracking-tight">
          Select a Collection in Object Explorer
        </h2>
        <p className="text-xs text-gray-400 max-w-sm mt-1">
          Pick a connection and collection from the left sidebar to inspect documents, indexes, and schema distributions.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-canvas overflow-hidden">
      {/* Workspace Sub-Header: Tabs & Action Modals Triggers */}
      <div className="h-10 px-4 bg-panel border-b border-hairline flex items-center justify-between shrink-0 select-none">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("documents")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === "documents"
                ? "bg-surface text-white border border-hairline shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-mongo" />
            <span>Documents</span>
          </button>

          <button
            onClick={() => setActiveTab("indexes")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === "indexes"
                ? "bg-surface text-white border border-hairline shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Indexes</span>
          </button>

          <button
            onClick={() => setActiveTab("schema")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === "schema"
                ? "bg-surface text-white border border-hairline shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
            <span>Schema Analysis</span>
          </button>
        </div>

        {/* Modal Action Triggers */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenBackup(database, collection)}
            className="px-2.5 py-1 rounded bg-surface hover:bg-surface-hover text-xs font-mono text-gray-300 border border-hairline flex items-center gap-1.5 transition-colors"
            title="Backup this collection"
          >
            <HardDriveDownload className="w-3 h-3 text-mongo" />
            <span className="hidden sm:inline">Backup</span>
          </button>

          <button
            onClick={() => onOpenExport(database, collection)}
            className="px-2.5 py-1 rounded bg-surface hover:bg-surface-hover text-xs font-mono text-gray-300 border border-hairline flex items-center gap-1.5 transition-colors"
            title="Export collection to CSV / JSON"
          >
            <Share2 className="w-3 h-3 text-emerald-400" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            onClick={() => onOpenImport(database, collection)}
            className="px-2.5 py-1 rounded bg-surface hover:bg-surface-hover text-xs font-mono text-gray-300 border border-hairline flex items-center gap-1.5 transition-colors"
            title="Import records into collection"
          >
            <Upload className="w-3 h-3 text-sky-400" />
            <span className="hidden sm:inline">Import</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeTab === "documents" && (
          <DocumentExplorer
            connectionId={connectionId}
            database={database}
            collection={collection}
            isProduction={isProduction}
            onRequireProductionConfirm={onRequireProductionConfirm}
          />
        )}

        {activeTab === "indexes" && (
          <IndexManager
            connectionId={connectionId}
            database={database}
            collection={collection}
            isProduction={isProduction}
            onRequireProductionConfirm={onRequireProductionConfirm}
          />
        )}

        {activeTab === "schema" && (
          <SchemaAnalyzer
            connectionId={connectionId}
            database={database}
            collection={collection}
          />
        )}
      </div>
    </div>
  );
};
