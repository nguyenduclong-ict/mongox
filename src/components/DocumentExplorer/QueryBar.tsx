import React, { useState } from "react";
import { Search, Play, SlidersHorizontal, Clock, Hash, ChevronDown } from "lucide-react";

interface QueryBarProps {
  filter: string;
  setFilter: (val: string) => void;
  sort: string;
  setSort: (val: string) => void;
  projection: string;
  setProjection: (val: string) => void;
  limit: number;
  setLimit: (val: number) => void;
  onExecute: () => void;
  isLoading: boolean;
  elapsedMs: number;
  totalCount: number;
}

export const QueryBar: React.FC<QueryBarProps> = ({
  filter,
  setFilter,
  sort,
  setSort,
  projection,
  setProjection,
  limit,
  setLimit,
  onExecute,
  isLoading,
  elapsedMs,
  totalCount,
}) => {
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      onExecute();
    }
  };

  return (
    <div className="bg-panel border-b border-hairline p-3 space-y-2 select-none">
      {/* Primary Query Row */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative flex items-center">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Filter: e.g. { "status": "active", "total": { "$gte": 100 } }'
            className="w-full pl-9 pr-3 py-1.5 bg-surface border border-hairline rounded-md text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-mongo transition-colors shadow-inner"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`px-2.5 py-1.5 rounded-md border text-xs font-mono flex items-center gap-1.5 transition-colors ${
            showAdvanced || sort || projection
              ? "bg-surface text-mongo border-mongo/30"
              : "bg-surface hover:bg-surface-hover text-gray-400 hover:text-gray-200 border-hairline"
          }`}
          title="Toggle Sort, Projection, Limit"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Options</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
        </button>

        <button
          type="button"
          onClick={onExecute}
          disabled={isLoading}
          className="px-3.5 py-1.5 bg-mongo hover:bg-emerald-600 text-gray-950 font-semibold text-xs rounded-md flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 shrink-0"
        >
          <Play className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : "fill-current"}`} />
          <span>{isLoading ? "Running..." : "Run"}</span>
          <kbd className="hidden md:inline text-[9px] bg-emerald-800/20 px-1 py-0.2 rounded border border-emerald-800/40 font-mono text-gray-900">
            Ctrl ↵
          </kbd>
        </button>
      </div>

      {/* Advanced Options Bar */}
      {showAdvanced && (
        <div className="pt-2 border-t border-hairline grid grid-cols-1 sm:grid-cols-3 gap-2.5 animate-in fade-in duration-150">
          <div>
            <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">
              Sort
            </label>
            <input
              type="text"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='{ "createdAt": -1 }'
              className="w-full px-2.5 py-1 bg-surface border border-hairline rounded text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-mongo"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">
              Project
            </label>
            <input
              type="text"
              value={projection}
              onChange={(e) => setProjection(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='{ "password": 0 }'
              className="w-full px-2.5 py-1 bg-surface border border-hairline rounded text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-mongo"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">
              Limit
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full px-2.5 py-1 bg-surface border border-hairline rounded text-xs font-mono text-white focus:outline-none focus:border-mongo"
            >
              <option value={20}>20 documents</option>
              <option value={50}>50 documents</option>
              <option value={100}>100 documents</option>
              <option value={500}>500 documents</option>
            </select>
          </div>
        </div>
      )}

      {/* Query Stats Ribbon */}
      <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 pt-0.5">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-gray-300">
            <Hash className="w-3 h-3 text-mongo" />
            <span>{totalCount.toLocaleString()} documents</span>
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-gray-500" />
            <span>{elapsedMs} ms</span>
          </span>
        </div>

        <div className="text-gray-500 text-[10px]">
          JSON Strict / Relaxed EJSON
        </div>
      </div>
    </div>
  );
};
