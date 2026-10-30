import React from "react";
import {
  Database,
  HardDriveDownload,
  Share2,
  Terminal,
  Cpu,
  Layers,
  ShieldAlert,
} from "lucide-react";

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  toolCounts: {
    shellReady: boolean;
    toolsReady: boolean;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  toolCounts,
}) => {
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
      badge: "Local",
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
    <aside className="w-56 bg-panel border-r border-hairline flex flex-col shrink-0 select-none">
      <div className="p-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
        Workspace Navigation
      </div>

      <nav className="flex-1 px-2 space-y-0.5">
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
