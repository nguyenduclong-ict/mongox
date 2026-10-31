import React, { useState } from "react";
import {
  Server,
  Folder,
  FileText,
  ChevronRight,
  ChevronDown,
  Plus,
  HardDriveDownload,
  Share2,
  Upload,
  Search,
  Zap,
  BarChart3,
  Trash2,
  Edit2,
  Users,
  Settings,
  RefreshCw,
} from "lucide-react";
import { ConnectionProfile, DatabaseInfo, Environment } from "../types";
import { ContextMenu, ContextMenuItem } from "./ContextMenu";

interface SidebarProps {
  connections: ConnectionProfile[];
  activeConnection: ConnectionProfile | null;
  onSelectConnection: (conn: ConnectionProfile) => void;
  onOpenNewConnection: () => void;
  hierarchy: DatabaseInfo[];
  selectedDb: string | null;
  selectedCollection: string | null;
  onSelectCollection: (db: string, col: string) => void;
  onOpenBackupModal: (db: string, col: string) => void;
  onOpenRestoreModal: (db: string) => void;
  onOpenExportModal: (db: string, col: string) => void;
  onOpenImportModal: (db: string, col: string) => void;
  onOpenUserManagement?: (db: string) => void;
  onDropCollection?: (db: string, col: string) => void;
  onDropDatabase?: (db: string) => void;
  onEditConnection?: (conn: ConnectionProfile) => void;
  onDeleteConnection?: (connId: string) => void;
  onOpenIndexesTab?: (db: string, col: string) => void;
  onOpenSchemaTab?: (db: string, col: string) => void;
  onOpenSettings?: () => void;
  onCreateDatabase?: (conn: ConnectionProfile) => void;
  onRefreshConnection?: (connId: string) => void;
  onRefreshDatabase?: (dbName: string) => void;
  onRefreshCollection?: (dbName: string, colName: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  connections,
  activeConnection,
  onSelectConnection,
  onOpenNewConnection,
  hierarchy,
  selectedDb,
  selectedCollection,
  onSelectCollection,
  onOpenBackupModal,
  onOpenRestoreModal,
  onOpenExportModal,
  onOpenImportModal,
  onOpenUserManagement,
  onDropCollection,
  onDropDatabase,
  onEditConnection,
  onDeleteConnection,
  onOpenIndexesTab,
  onOpenSchemaTab,
  onOpenSettings,
  onCreateDatabase,
  onRefreshConnection,
  onRefreshDatabase,
  onRefreshCollection,
}) => {
  const [filterText, setFilterText] = useState<string>("");
  const [expandedConns, setExpandedConns] = useState<Record<string, boolean>>({});
  const [expandedDbs, setExpandedDbs] = useState<Record<string, boolean>>({});

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);

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
      {/* Mongox Brand Header */}
      <div className="h-11 px-3 border-b border-hairline flex items-center justify-between shrink-0 bg-panel">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-mongo" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          <span className="text-xs font-bold text-white tracking-wider font-mono">
            mongox
          </span>
        </div>

        <div className="flex items-center gap-1">
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded hover:bg-surface text-gray-400 hover:text-white transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar with + Connection button */}
      <div className="p-2 border-b border-hairline bg-surface/30 flex items-center gap-1.5">
        <div className="relative flex-1 flex items-center">
          <Search className="w-3 h-3 text-gray-500 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter database & collection..."
            className="w-full pl-7 pr-2 py-1 bg-surface border border-hairline rounded text-[11px] font-mono text-gray-200 placeholder-gray-500 focus:outline-none focus:border-mongo transition-colors"
          />
        </div>
        <button
          onClick={onOpenNewConnection}
          aria-label="Add Connection"
          className="p-1.5 rounded bg-surface hover:bg-surface-hover border border-hairline text-gray-300 hover:text-white transition-colors shrink-0"
          title="Add Connection"
        >
          <Plus className="w-3.5 h-3.5 text-mongo" />
        </button>
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
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    items: [
                      {
                        label: `Connect: ${conn.name}`,
                        icon: Server,
                        onClick: () => onSelectConnection(conn),
                      },
                      {
                        label: "Refresh",
                        icon: RefreshCw,
                        onClick: () => onRefreshConnection?.(conn.id),
                      },
                      {
                        label: "Create Database",
                        icon: Plus,
                        onClick: () => onCreateDatabase?.(conn),
                      },
                      {
                        label: "Manage Users",
                        icon: Users,
                        onClick: () => onOpenUserManagement?.("admin"),
                      },
                      { divider: true },
                      {
                        label: "Dump",
                        icon: HardDriveDownload,
                        onClick: () => onOpenBackupModal("", ""),
                      },
                      {
                        label: "Restore",
                        icon: Upload,
                        onClick: () => onOpenRestoreModal(""),
                      },
                      { divider: true },
                      {
                        label: "Edit Connection",
                        icon: Edit2,
                        onClick: () => onEditConnection?.(conn),
                      },
                      {
                        label: "Delete Connection",
                        icon: Trash2,
                        danger: true,
                        onClick: () => onDeleteConnection?.(conn.id),
                      },
                    ],
                  });
                }}
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
                    const isDbExpanded =
                      expandedDbs[db.name] ??
                      (db.name === selectedDb ||
                        db.name === "test_db" ||
                        filteredHierarchy.length <= 2);
                    const isDbActive = selectedDb === db.name;

                    return (
                      <div key={db.name} className="space-y-0.5">
                        {/* Database Node */}
                        <div
                          onClick={(e) => toggleDb(db.name, e)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({
                              x: e.clientX,
                              y: e.clientY,
                              items: [
                                {
                                  label: "Refresh",
                                  icon: RefreshCw,
                                  onClick: () => onRefreshDatabase?.(db.name),
                                },
                                { divider: true },
                                {
                                  label: "Dump",
                                  icon: HardDriveDownload,
                                  onClick: () => onOpenBackupModal(db.name, ""),
                                },
                                {
                                  label: "Restore",
                                  icon: Upload,
                                  onClick: () => onOpenRestoreModal(db.name),
                                },
                                {
                                  label: "Export",
                                  icon: Share2,
                                  onClick: () => onOpenExportModal(db.name, db.collections[0]?.name || ""),
                                },
                                {
                                  label: "Import",
                                  icon: Upload,
                                  onClick: () => onOpenImportModal(db.name, db.collections[0]?.name || ""),
                                },
                                {
                                  label: "Manage Users",
                                  icon: Users,
                                  onClick: () => onOpenUserManagement?.(db.name),
                                },
                                { divider: true },
                                {
                                  label: `Drop Database (${db.name})`,
                                  icon: Trash2,
                                  danger: true,
                                  onClick: () => onDropDatabase?.(db.name),
                                },
                              ],
                            });
                          }}
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
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      setContextMenu({
                                        x: e.clientX,
                                        y: e.clientY,
                                        items: [
                                          {
                                            label: `Open Documents (${col.name})`,
                                            icon: FileText,
                                            onClick: () => onSelectCollection(db.name, col.name),
                                          },
                                          {
                                            label: "Refresh",
                                            icon: RefreshCw,
                                            onClick: () => onRefreshCollection?.(db.name, col.name),
                                          },
                                          {
                                            label: "View Indexes",
                                            icon: Zap,
                                            onClick: () => {
                                              onSelectCollection(db.name, col.name);
                                              onOpenIndexesTab?.(db.name, col.name);
                                            },
                                          },
                                          {
                                            label: "Analyze Schema",
                                            icon: BarChart3,
                                            onClick: () => {
                                              onSelectCollection(db.name, col.name);
                                              onOpenSchemaTab?.(db.name, col.name);
                                            },
                                          },
                                          { divider: true },
                                          {
                                            label: "Backup Collection",
                                            icon: HardDriveDownload,
                                            onClick: () => onOpenBackupModal(db.name, col.name),
                                          },
                                          {
                                            label: "Export Data (CSV/JSON)",
                                            icon: Share2,
                                            onClick: () => onOpenExportModal(db.name, col.name),
                                          },
                                          {
                                            label: "Import Data",
                                            icon: Upload,
                                            onClick: () => onOpenImportModal(db.name, col.name),
                                          },
                                          { divider: true },
                                          {
                                            label: `Drop Collection (${col.name})`,
                                            icon: Trash2,
                                            danger: true,
                                            onClick: () => onDropCollection?.(db.name, col.name),
                                          },
                                        ],
                                      });
                                    }}
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

      {/* Floating Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </aside>
  );
};
