import React, { useState } from "react";
import {
  Server,
  Folder,
  FileText,
  ChevronRight,
  ChevronDown,
  Plus,
  Settings,
  HardDriveDownload,
  Share2,
  Upload,
  Search,
  ExternalLink,
} from "lucide-react";
import { ConnectionProfile, DatabaseInfo, Environment } from "../types";
import { openBackupDirectory } from "../services/tauri";

interface SidebarProps {
  connections: ConnectionProfile[];
  activeConnection: ConnectionProfile | null;
  onSelectConnection: (conn: ConnectionProfile) => void;
  onOpenNewConnection: () => void;
  onOpenSettings: () => void;
  hierarchy: DatabaseInfo[];
  selectedDb: string | null;
  selectedCollection: string | null;
  onSelectCollection: (db: string, col: string) => void;
  onOpenBackupModal: (db: string, col: string) => void;
  onOpenRestoreModal: (db: string) => void;
  onOpenExportModal: (db: string, col: string) => void;
  onOpenImportModal: (db: string, col: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  connections,
  activeConnection,
  onSelectConnection,
  onOpenNewConnection,
  onOpenSettings,
  hierarchy,
  selectedDb,
  selectedCollection,
  onSelectCollection,
  onOpenBackupModal,
  onOpenExportModal,
  onOpenImportModal,
}) => {
  const [filterText, setFilterText] = useState<string>("");
  const [expandedConns, setExpandedConns] = useState<Record<string, boolean>>({
    "local-1": true,
  });
  const [expandedDbs, setExpandedDbs] = useState<Record<string, boolean>>({
    store_db: true,
    analytics: true,
  });

  const toggleConn = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedConns((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleDb = (dbName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDbs((prev) => ({
      ...prev,
      [dbName]: !prev[dbName],
    }));
  };

  const getEnvBadge = (env: Environment) => {
    switch (env) {
      case "production":
        return {
          bg: "bg-guard/20 border-guard/40 text-red-300",
          label: "PROD",
        };
      case "staging":
        return {
          bg: "bg-purple-500/20 border-purple-500/40 text-purple-300",
          label: "STAG",
        };
      case "development":
        return {
          bg: "bg-blue-500/20 border-blue-500/40 text-blue-300",
          label: "DEV",
        };
      default:
        return {
          bg: "bg-mongo/20 border-mongo/40 text-emerald-300",
          label: "LOCAL",
        };
    }
  };

  // Filter hierarchy databases and collections based on filterText
  const filteredHierarchy = hierarchy
    .map((db) => {
      const dbMatches = db.name.toLowerCase().includes(filterText.toLowerCase());
      const filteredCols = db.collections.filter((col) =>
        col.name.toLowerCase().includes(filterText.toLowerCase())
      );
      if (dbMatches || filteredCols.length > 0) {
        return {
          ...db,
          collections: dbMatches ? db.collections : filteredCols,
        };
      }
      return null;
    })
    .filter(Boolean) as DatabaseInfo[];

  return (
    <aside className="w-64 bg-panel border-r border-hairline flex flex-col shrink-0 select-none overflow-hidden font-sans">
      {/* Object Explorer Header */}
      <div className="h-11 px-3 border-b border-hairline flex items-center justify-between shrink-0 bg-panel">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
          <span>Object Explorer</span>
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={onOpenNewConnection}
            className="p-1 rounded hover:bg-surface text-gray-400 hover:text-white transition-colors"
            title="Add New Connection Profile"
          >
            <Plus className="w-4 h-4 text-mongo" />
          </button>
          <button
            onClick={onOpenSettings}
            className="p-1 rounded hover:bg-surface text-gray-400 hover:text-white transition-colors"
            title="Application Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Input */}
      <div className="p-2 border-b border-hairline bg-surface/30">
        <div className="relative flex items-center">
          <Search className="w-3 h-3 text-gray-500 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter databases & collections..."
            className="w-full pl-7 pr-2 py-1 bg-surface border border-hairline rounded text-[11px] font-mono text-gray-200 placeholder-gray-500 focus:outline-none focus:border-mongo transition-colors"
          />
        </div>
      </div>

      {/* Multi-Connection & Hierarchy Tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-0">
        {connections.map((conn) => {
          const isActive = activeConnection?.id === conn.id;
          const isExpanded = expandedConns[conn.id] ?? (isActive || connections.length === 1);
          const badge = getEnvBadge(conn.environment);

          return (
            <div key={conn.id} className="space-y-0.5">
              {/* Connection Root Node */}
              <div
                onClick={() => onSelectConnection(conn)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors group ${
                  isActive
                    ? "bg-surface border border-hairline text-white shadow-sm"
                    : "hover:bg-surface/50 text-gray-400 hover:text-gray-200"
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <div
                    onClick={(e) => toggleConn(conn.id, e)}
                    className="p-0.5 hover:text-white"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3 text-gray-500 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-gray-500 shrink-0" />
                    )}
                  </div>
                  <Server
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? "text-mongo" : "text-gray-500"
                    }`}
                  />
                  <span className="truncate text-xs font-semibold font-mono">
                    {conn.name}
                  </span>
                </div>

                <span
                  className={`text-[9px] font-mono px-1 py-0.2 rounded border font-semibold ${badge.bg}`}
                >
                  {badge.label}
                </span>
              </div>

              {/* Expanded Databases under Active Connection */}
              {isExpanded && isActive && (
                <div className="pl-3 border-l border-hairline/60 ml-2 space-y-1 pt-0.5">
                  {filteredHierarchy.map((db) => {
                    const isDbExpanded = expandedDbs[db.name] ?? false;
                    const isDbActive = selectedDb === db.name;

                    return (
                      <div key={db.name} className="space-y-0.5">
                        {/* Database Node */}
                        <div
                          onClick={(e) => toggleDb(db.name, e)}
                          className={`w-full flex items-center justify-between px-2 py-1 rounded text-xs cursor-pointer transition-colors group/db ${
                            isDbActive
                              ? "bg-surface/60 text-white"
                              : "text-gray-400 hover:text-gray-200 hover:bg-surface/30"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            {isDbExpanded ? (
                              <ChevronDown className="w-3 h-3 text-gray-500 shrink-0" />
                            ) : (
                              <ChevronRight className="w-3 h-3 text-gray-500 shrink-0" />
                            )}
                            <Folder className="w-3.5 h-3.5 text-mongo shrink-0" />
                            <span className="truncate font-mono font-medium text-[11px]">
                              {db.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-500 font-mono">
                              {db.collections.length}
                            </span>
                          </div>
                        </div>

                        {/* Collections List */}
                        {isDbExpanded && (
                          <div className="pl-4 space-y-0.5 border-l border-hairline/40 ml-2">
                            {db.collections.length === 0 ? (
                              <div className="text-[10px] text-gray-600 pl-2 py-0.5 italic font-mono">
                                (no collections)
                              </div>
                            ) : (
                              db.collections.map((col) => {
                                const isColActive =
                                  selectedDb === db.name &&
                                  selectedCollection === col.name;

                                return (
                                  <div
                                    key={col.name}
                                    onClick={() => onSelectCollection(db.name, col.name)}
                                    className={`w-full flex items-center justify-between pl-2 pr-1.5 py-1 rounded text-[11px] font-mono cursor-pointer transition-colors group/col ${
                                      isColActive
                                        ? "bg-mongo/10 text-mongo border border-mongo/30 font-semibold"
                                        : "text-gray-400 hover:text-gray-200 hover:bg-surface/40"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 truncate">
                                      <FileText className="w-3 h-3 text-gray-500 shrink-0" />
                                      <span className="truncate">{col.name}</span>
                                    </div>

                                    {/* Action icons on hover */}
                                    <div className="flex items-center gap-1">
                                      <div className="hidden group-hover/col:flex items-center gap-0.5">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenBackupModal(db.name, col.name);
                                          }}
                                          className="p-0.5 rounded hover:bg-surface text-gray-400 hover:text-mongo"
                                          title="Backup collection"
                                        >
                                          <HardDriveDownload className="w-2.5 h-2.5" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenExportModal(db.name, col.name);
                                          }}
                                          className="p-0.5 rounded hover:bg-surface text-gray-400 hover:text-emerald-400"
                                          title="Export collection"
                                        >
                                          <Share2 className="w-2.5 h-2.5" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenImportModal(db.name, col.name);
                                          }}
                                          className="p-0.5 rounded hover:bg-surface text-gray-400 hover:text-sky-400"
                                          title="Import data into collection"
                                        >
                                          <Upload className="w-2.5 h-2.5" />
                                        </button>
                                      </div>

                                      <span className="text-[9px] text-gray-500 bg-canvas px-1 rounded">
                                        {col.count > 1000
                                          ? `${(col.count / 1000).toFixed(0)}k`
                                          : col.count}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer */}
      <div className="p-2 border-t border-hairline bg-panel space-y-1 shrink-0">
        <button
          onClick={() => openBackupDirectory()}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-surface text-xs font-mono text-gray-400 hover:text-gray-200 transition-colors"
          title="Open Backup Directory in Windows Explorer"
        >
          <div className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5 text-mongo" />
            <span>Open Backups</span>
          </div>
          <span className="text-[10px] text-gray-600">Folder</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-surface text-xs font-mono text-gray-400 hover:text-gray-200 transition-colors"
          title="Application Settings"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-3.5 h-3.5 text-gray-400" />
            <span>Settings</span>
          </div>
          <span className="text-[10px] text-gray-600">CLI & Hub</span>
        </button>
      </div>
    </aside>
  );
};
