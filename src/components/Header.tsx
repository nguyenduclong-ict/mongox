import React from "react";
import { Search, RefreshCw, Sparkles } from "lucide-react";

interface HeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
  activeCount: number;
  totalCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onRefresh,
  isLoading,
  activeCount,
  totalCount,
}) => {
  return (
    <header className="h-11 bg-panel border-b border-hairline px-4 flex items-center justify-between shrink-0 select-none">
      {/* Left: Brand & Status Pill */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-mongo/10 border border-mongo/30 flex items-center justify-center text-mongo font-bold text-xs">
            X
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">Mongox</span>
          <span className="text-[10px] text-gray-400 font-mono bg-surface px-1.5 py-0.5 rounded border border-hairline">
            v0.1.0-alpha
          </span>
        </div>

        <div className="h-4 w-[1px] bg-hairline" />

        {/* Engine readiness badge */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface/80 border border-hairline text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              activeCount > 0 ? "bg-mongo animate-pulse" : "bg-amber-400"
            }`}
          />
          <span className="text-gray-300 font-mono text-[11px]">
            Engine: {activeCount}/{totalCount} Tools Ready
          </span>
        </div>
      </div>

      {/* Center: Command Palette Trigger */}
      <div className="flex items-center">
        <button
          className="flex items-center gap-2 px-3 py-1 bg-surface hover:bg-surface-hover text-gray-400 hover:text-gray-200 border border-hairline rounded-md text-xs transition-colors duration-150 shadow-sm"
          title="Command Palette (Ctrl + K)"
        >
          <Search className="w-3.5 h-3.5 text-gray-400" />
          <span>Search tools, databases, commands...</span>
          <kbd className="text-[10px] font-mono bg-panel px-1.5 py-0.5 rounded border border-hairline text-gray-400">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right: Quick actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1.5 rounded-md hover:bg-surface text-gray-400 hover:text-white border border-transparent hover:border-hairline transition-all duration-150 disabled:opacity-50"
          title="Refresh Engine Status"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-mongo" : ""}`} />
        </button>

        <div className="flex items-center gap-1 px-2 py-1 rounded bg-mongo/10 border border-mongo/20 text-mongo text-xs font-mono">
          <Sparkles className="w-3 h-3 text-mongo" />
          <span>Tauri v2 + Rust</span>
        </div>
      </div>
    </header>
  );
};
