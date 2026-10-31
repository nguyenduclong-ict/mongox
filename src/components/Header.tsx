import React from "react";
import { RefreshCw, ChevronRight, ShieldAlert, Server, Settings } from "lucide-react";
import { ConnectionProfile } from "../types";

interface HeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
  activeCount: number;
  totalCount: number;
  activeConnection: ConnectionProfile | null;
  activeDatabase: string | null;
  activeCollection: string | null;
  latencyMs?: number | null;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onRefresh,
  isLoading,
  activeCount,
  totalCount,
  activeConnection,
  activeDatabase,
  activeCollection,
  latencyMs,
  onOpenSettings,
}) => {
  const isProd = activeConnection?.environment === "production";

  return (
    <header className="h-11 bg-panel border-b border-hairline px-4 flex items-center justify-between shrink-0 select-none">
      {/* Left: Brand & Breadcrumb */}
      <div className="flex items-center gap-3 truncate max-w-[65%]">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-5 h-5 rounded bg-mongo/10 border border-mongo/30 flex items-center justify-center text-mongo font-bold text-xs">
            X
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">Mongox</span>
        </div>

        <div className="h-4 w-[1px] bg-hairline shrink-0" />

        {/* Environment Badge & Latency */}
        {activeConnection ? (
          <div className="flex items-center gap-1.5 truncate text-xs">
            <span
              className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold border flex items-center gap-1 shrink-0 ${
                isProd
                  ? "bg-guard/20 border-guard/40 text-red-300 animate-pulse"
                  : "bg-surface border-hairline text-gray-300"
              }`}
            >
              {isProd ? (
                <ShieldAlert className="w-3 h-3 text-guard" />
              ) : (
                <Server className="w-3 h-3 text-mongo" />
              )}
              <span className="capitalize">{activeConnection.environment}</span>
              {latencyMs !== undefined && latencyMs !== null && (
                <span className="text-mongo ml-0.5">● {latencyMs}ms</span>
              )}
            </span>

            {/* Breadcrumb Path */}
            <div className="flex items-center gap-1 text-gray-400 font-mono text-[11px] truncate">
              <span className="text-gray-200 truncate">{activeConnection.name}</span>
              {activeDatabase && (
                <>
                  <ChevronRight className="w-3 h-3 text-gray-600 shrink-0" />
                  <span className="text-gray-300 truncate">{activeDatabase}</span>
                </>
              )}
              {activeCollection && (
                <>
                  <ChevronRight className="w-3 h-3 text-gray-600 shrink-0" />
                  <span className="text-mongo font-medium truncate">{activeCollection}</span>
                </>
              )}
            </div>
          </div>
        ) : (
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
        )}
      </div>

      {/* Right: Quick actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1.5 rounded-md hover:bg-surface text-gray-400 hover:text-white border border-transparent hover:border-hairline transition-all duration-150 disabled:opacity-50"
          title="Refresh Engine & Schema"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-mongo" : ""}`} />
        </button>

        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-md hover:bg-surface text-gray-400 hover:text-white border border-transparent hover:border-hairline transition-all duration-150"
            title="Application Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </header>
  );
};
