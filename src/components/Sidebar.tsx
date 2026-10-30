import React, { useState } from "react";
import {
  Database,
  HardDriveDownload,
  Share2,
  Terminal,
  Cpu,
  Layers,
  ShieldAlert,
  ChevronRight,
  ChevronDown,
  Folder,
  FileText,
} from "lucide-react";
import { DatabaseInfo } from "../types";

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  toolCounts: {
    shellReady: boolean;
    toolsReady: boolean;
  };
  hierarchy?: DatabaseInfo[];
  selectedDb?: string | null;
  selectedCollection?: string | null;
  onSelectCollection?: (db: string, coll: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  toolCounts,
  hierarchy = [],
  selectedDb,
  selectedCollection,
  onSelectCollection,
}) => {
  const [expandedDbs, setExpandedDbs] = useState<Record<string, boolean>>({
    store_db: true,
    admin: false,
    analytics: true,
  });

  const toggleDb = (dbName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDbs((prev) => ({
      ...prev,
      [dbName]: !prev[dbName],
    }));
  };

  const navItems = [
    {
      id: "engine",
      label: "Engine & Tools",
      icon: Cpu,
      badge: toolCounts.shellReady && toolCounts.toolsReady ? "Ready" : "JIT",
      badgeColor: toolCounts.shellReady && toolCounts.toolsReady ? "text-mongo" : "text-amber-400",
    },
    {
      id: "connections",
      label: "Connections",
      icon: Database,
      badge: "Config",
      badgeColor: "text-gray-400",
    },
    {
      id: "documents",
      label: "Document Explorer",
      icon: Layers,
      badge: toolCounts.shellReady ? "Ready" : "Lazy",
      badgeColor: toolCounts.shellReady ? "text-mongo" : "text-gray-500",
    },
    {
      id: "backup",
      label: "Backup & Restore",
      icon: HardDriveDownload,
      badge: toolCounts.toolsReady ? "Ready" : "Lazy",
      badgeColor: toolCounts.toolsReady ? "text-mongo" : "text-gray-500",
    },
    {
      id: "export",
      label: "Export & Import",
      icon: Share2,
      badge: toolCounts.toolsReady ? "Ready" : "Lazy",
      badgeColor: toolCounts.toolsReady ? "text-mongo" : "text-gray-500",
    },
    {
      id: "console",
      label: "Mongosh Console",
      icon: Terminal,
      badge: toolCounts.shellReady ? "Ready" : "Lazy",
      badgeColor: toolCounts.shellReady ? "text-mongo" : "text-gray-500",
    },
  ];

  return (
    <aside className="w-60 bg-panel border-r border-hairline flex flex-col shrink-0 select-none overflow-hidden">
      {/* Workspace Navigation */}
      <div className="p-3 pb-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
        Workspace Navigation
      </div>

      <nav className="px-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                isActive
                  ? "bg-surface text-white border border-hairline/80 shadow-sm"
                  : "text-gray-400 hover:text-gray-200 hover:bg-surface/50 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? "text-mongo" : "text-gray-400"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded bg-canvas border border-hairline/60 ${item.badgeColor}`}
              >
                {item.badge}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Database & Collection Hierarchy Tree */}
      <div className="flex-1 flex flex-col min-h-0 border-t border-hairline mt-3">
        <div className="p-3 pb-1 flex items-center justify-between text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
          <span>Databases & Collections</span>
          <span className="font-mono text-gray-400 lowercase">{hierarchy.length} dbs</span>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {hierarchy.length === 0 ? (
            <div className="p-3 text-[11px] text-gray-500 text-center font-mono">
              No active database connection
            </div>
          ) : (
            hierarchy.map((db) => {
              const isExpanded = expandedDbs[db.name] ?? false;
              const isDbActive = selectedDb === db.name;

              return (
                <div key={db.name} className="space-y-0.5">
                  {/* Database Node */}
                  <div
                    onClick={(e) => toggleDb(db.name, e)}
                    className={`w-full flex items-center justify-between px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                      isDbActive
                        ? "text-gray-200 bg-surface/40"
                        : "text-gray-400 hover:text-gray-200 hover:bg-surface/20"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      )}
                      <Folder className="w-3.5 h-3.5 text-mongo shrink-0" />
                      <span className="truncate font-medium">{db.name}</span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {db.collections.length}
                    </span>
                  </div>

                  {/* Collections List */}
                  {isExpanded && (
                    <div className="pl-4 space-y-0.5">
                      {db.collections.length === 0 ? (
                        <div className="text-[10px] text-gray-600 pl-3 py-0.5 italic font-mono">
                          (empty)
                        </div>
                      ) : (
                        db.collections.map((col) => {
                          const isColActive =
                            selectedDb === db.name && selectedCollection === col.name;

                          return (
                            <button
                              key={col.name}
                              onClick={() => {
                                if (onSelectCollection) {
                                  onSelectCollection(db.name, col.name);
                                }
                                onSelectTab("documents");
                              }}
                              className={`w-full flex items-center justify-between pl-2 pr-1.5 py-1 rounded text-[11px] font-mono transition-colors ${
                                isColActive
                                  ? "bg-mongo/10 text-mongo border border-mongo/20 font-semibold"
                                  : "text-gray-400 hover:text-gray-200 hover:bg-surface/30 border border-transparent"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <FileText className="w-3 h-3 text-gray-500 shrink-0" />
                                <span className="truncate">{col.name}</span>
                              </div>
                              <span className="text-[9px] text-gray-500 bg-canvas px-1 rounded">
                                {col.count > 1000
                                  ? `${(col.count / 1000).toFixed(0)}k`
                                  : col.count}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Production Guard Banner */}
      <div className="p-3 border-t border-hairline">
        <div className="bg-surface/60 border border-hairline rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-xs text-gray-300 font-medium">
            <ShieldAlert className="w-3.5 h-3.5 text-guard" />
            <span>Production Guard</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
            Multi-step typed confirmation active on critical environments.
          </p>
        </div>
      </div>
    </aside>
  );
};
