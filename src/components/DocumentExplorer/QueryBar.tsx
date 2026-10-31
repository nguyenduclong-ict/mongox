import React, { useState, useEffect } from "react";
import {
  Search,
  Play,
  SlidersHorizontal,
  Clock,
  Hash,
  ChevronDown,
  Activity,
  Star,
  BookmarkCheck,
  History,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Copy,
  FileJson,
} from "lucide-react";

interface QueryBarProps {
  filter: string;
  setFilter: (val: string) => void;
  sort: string;
  setSort: (val: string) => void;
  projection: string;
  setProjection: (val: string) => void;
  limit: number;
  setLimit: (val: number) => void;
  skip?: number;
  onPageChange?: (newSkip: number) => void;
  onExecute: () => void;
  onExplain?: () => void;
  isLoading: boolean;
  elapsedMs: number;
  totalCount: number;
  selectedCount?: number;
  onCopySelectedIds?: () => void;
  onCopySelectedJson?: () => void;
  onDeleteSelected?: () => void;
  onDeselectAll?: () => void;
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
  skip = 0,
  onPageChange,
  onExecute,
  onExplain,
  isLoading,
  elapsedMs,
  totalCount,
  selectedCount = 0,
  onCopySelectedIds,
  onCopySelectedJson,
  onDeleteSelected,
  onDeselectAll,
}) => {
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showBookmarks, setShowBookmarks] = useState<boolean>(false);

  const [history, setHistory] = useState<string[]>([]);
  const [bookmarks, setBookmarks] = useState<{ id: string; name: string; filter: string }[]>([]);
  const [bookmarkName, setBookmarkName] = useState<string>("");
  const [isSavingBookmark, setIsSavingBookmark] = useState<boolean>(false);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem("mongox_recent_queries");
      if (storedHistory) setHistory(JSON.parse(storedHistory));

      const storedBookmarks = localStorage.getItem("mongox_query_bookmarks");
      if (storedBookmarks) setBookmarks(JSON.parse(storedBookmarks));
    } catch {
      // ignore
    }
  }, []);

  const saveToHistory = (queryStr: string) => {
    const q = queryStr.trim();
    if (!q || q === "{}") return;
    setHistory((prev) => {
      const updated = [q, ...prev.filter((item) => item !== q)].slice(0, 20);
      try {
        localStorage.setItem("mongox_recent_queries", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleRun = () => {
    saveToHistory(filter);
    onExecute();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleRun();
    }
  };

  const handleSaveBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookmarkName.trim() || !filter.trim()) return;

    const newBm = {
      id: `bm-${Date.now()}`,
      name: bookmarkName.trim(),
      filter: filter.trim(),
    };

    setBookmarks((prev) => {
      const updated = [newBm, ...prev];
      try {
        localStorage.setItem("mongox_query_bookmarks", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    setBookmarkName("");
    setIsSavingBookmark(false);
  };

  const handleDeleteBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarks((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      try {
        localStorage.setItem("mongox_query_bookmarks", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  return (
    <div className="bg-panel border-b border-hairline p-3 space-y-2 select-none relative">
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
            className="w-full pl-9 pr-20 py-1.5 bg-surface border border-hairline rounded-md text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-mongo transition-colors shadow-inner"
          />

          {/* Quick history & bookmark triggers inside right of input */}
          <div className="absolute right-1.5 flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setShowHistory(!showHistory);
                setShowBookmarks(false);
              }}
              className={`p-1 rounded text-xs transition-colors ${
                showHistory ? "text-mongo bg-surface" : "text-gray-500 hover:text-gray-300"
              }`}
              title="Recent Query History"
            >
              <History className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                setShowBookmarks(!showBookmarks);
                setShowHistory(false);
              }}
              className={`p-1 rounded text-xs transition-colors ${
                showBookmarks ? "text-amber-400 bg-surface" : "text-gray-500 hover:text-gray-300"
              }`}
              title="Saved Query Bookmarks"
            >
              <Star className="w-3.5 h-3.5" />
            </button>
          </div>
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

        {onExplain && (
          <button
            type="button"
            onClick={onExplain}
            className="px-2.5 py-1.5 rounded-md bg-surface hover:bg-surface-hover text-xs font-mono text-gray-300 border border-hairline flex items-center gap-1.5 transition-colors"
            title="Explain Execution Plan (COLLSCAN vs IXSCAN)"
          >
            <Activity className="w-3.5 h-3.5 text-mongo" />
            <span className="hidden md:inline">Explain</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleRun}
          disabled={isLoading}
          className="px-3.5 py-1.5 bg-mongo hover:bg-emerald-600 text-gray-950 font-semibold text-xs rounded-md flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 shrink-0 min-w-[72px]"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-950" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
          <span>Run</span>
          <kbd className="hidden md:inline text-[9px] bg-emerald-800/20 px-1 py-0.2 rounded border border-emerald-800/40 font-mono text-gray-900">
            Ctrl ↵
          </kbd>
        </button>
      </div>

      {/* Query History Dropdown Panel */}
      {showHistory && (
        <div className="absolute left-3 right-3 top-12 z-40 bg-modal border border-hairline rounded-lg shadow-modal p-2.5 space-y-1.5 text-xs font-mono animate-in fade-in duration-100">
          <div className="flex items-center justify-between pb-1 border-b border-hairline/60 text-gray-400 text-[10px] uppercase">
            <span>Recent Query History (Last 20)</span>
            <button
              onClick={() => {
                setHistory([]);
                localStorage.removeItem("mongox_recent_queries");
              }}
              className="hover:text-guard"
            >
              Clear
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {history.length > 0 ? (
              history.map((q, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setFilter(q);
                    setShowHistory(false);
                  }}
                  className="p-1.5 rounded hover:bg-surface text-gray-300 hover:text-white cursor-pointer truncate transition-colors"
                >
                  {q}
                </div>
              ))
            ) : (
              <div className="text-[11px] text-gray-500 py-2 text-center italic">
                No recent queries recorded.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Query Bookmarks Dropdown Panel */}
      {showBookmarks && (
        <div className="absolute left-3 right-3 top-12 z-40 bg-modal border border-hairline rounded-lg shadow-modal p-2.5 space-y-2 text-xs font-mono animate-in fade-in duration-100">
          <div className="flex items-center justify-between pb-1 border-b border-hairline/60 text-gray-400 text-[10px] uppercase">
            <span>Saved Query Bookmarks</span>
            <button
              onClick={() => setIsSavingBookmark(!isSavingBookmark)}
              className="text-mongo hover:text-emerald-400 flex items-center gap-1"
            >
              <BookmarkCheck className="w-3 h-3" />
              <span>Bookmark Current</span>
            </button>
          </div>

          {isSavingBookmark && (
            <form onSubmit={handleSaveBookmark} className="flex gap-2 p-2 rounded bg-surface border border-hairline">
              <input
                type="text"
                value={bookmarkName}
                onChange={(e) => setBookmarkName(e.target.value)}
                placeholder="Bookmark Name (e.g. Active Orders)"
                required
                className="flex-1 px-2 py-1 bg-panel border border-hairline rounded text-[11px] text-white focus:outline-none focus:border-mongo"
              />
              <button
                type="submit"
                className="px-2.5 py-1 bg-mongo text-gray-950 font-semibold rounded text-[11px]"
              >
                Save
              </button>
            </form>
          )}

          <div className="max-h-48 overflow-y-auto space-y-1">
            {bookmarks.length > 0 ? (
              bookmarks.map((b) => (
                <div
                  key={b.id}
                  onClick={() => {
                    setFilter(b.filter);
                    setShowBookmarks(false);
                  }}
                  className="p-1.5 rounded hover:bg-surface text-gray-300 hover:text-white cursor-pointer flex items-center justify-between transition-colors group"
                >
                  <div className="truncate max-w-sm">
                    <div className="font-semibold text-white">{b.name}</div>
                    <div className="text-[10px] text-gray-500 truncate">{b.filter}</div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteBookmark(b.id, e)}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:text-guard"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-[11px] text-gray-500 py-2 text-center italic">
                No bookmarked queries. Click "Bookmark Current" to save.
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Query Stats & Pagination Ribbon */}
      {(() => {
        const pageSize = limit;
        const currentSkip = skip || 0;
        const currentPage = Math.floor(currentSkip / pageSize) + 1;
        const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
        const startRecord = totalCount === 0 ? 0 : currentSkip + 1;
        const endRecord = Math.min(currentSkip + pageSize, totalCount);

        return (
          <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-gray-400 pt-0.5 gap-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-gray-300">
                <Hash className="w-3 h-3 text-mongo" />
                <span>
                  {totalCount > 0
                    ? `${startRecord.toLocaleString()} - ${endRecord.toLocaleString()} of ${totalCount.toLocaleString()} documents`
                    : "0 documents"}
                </span>
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-500" />
                <span>{elapsedMs} ms</span>
              </span>
            </div>

            {/* Multi-Selection Action Buttons (Inline with pagination bar) */}
            {selectedCount > 0 && (
              <div className="flex items-center gap-2 select-none animate-in fade-in duration-100">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-mongo/10 border border-mongo/30 text-[11px] font-mono text-emerald-300">
                  <span className="font-semibold text-white">{selectedCount}</span>
                  <span>documents selected</span>
                </div>
                {onCopySelectedIds && (
                  <button
                    type="button"
                    onClick={onCopySelectedIds}
                    className="px-2 py-0.5 rounded bg-surface hover:bg-surface-hover text-gray-300 border border-hairline flex items-center gap-1 text-[11px] font-mono transition-colors"
                    title="Copy Selected IDs"
                  >
                    <Copy className="w-3 h-3 text-sky-400" />
                    <span>Copy IDs</span>
                  </button>
                )}
                {onCopySelectedJson && (
                  <button
                    type="button"
                    onClick={onCopySelectedJson}
                    className="px-2 py-0.5 rounded bg-surface hover:bg-surface-hover text-gray-300 border border-hairline flex items-center gap-1 text-[11px] font-mono transition-colors"
                    title="Copy Selected JSON Documents"
                  >
                    <FileJson className="w-3 h-3 text-mongo" />
                    <span>Copy JSON</span>
                  </button>
                )}
                {onDeleteSelected && (
                  <button
                    type="button"
                    onClick={onDeleteSelected}
                    className="px-2 py-0.5 rounded bg-guard/10 hover:bg-guard/20 text-red-300 border border-guard/30 flex items-center gap-1 text-[11px] font-mono transition-colors"
                    title="Delete Selected Documents"
                  >
                    <Trash2 className="w-3 h-3 text-guard" />
                    <span>Delete Selected</span>
                  </button>
                )}
                {onDeselectAll && (
                  <button
                    type="button"
                    onClick={onDeselectAll}
                    className="px-1.5 py-0.5 rounded hover:bg-surface text-gray-400 hover:text-white text-[11px] transition-colors"
                  >
                    Deselect All
                  </button>
                )}
              </div>
            )}

            {/* Pagination Navigation Controls */}
            <div className="flex items-center gap-2">
              {/* Page size dropdown */}
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-gray-500">Show:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    const newLimit = Number(e.target.value);
                    setLimit(newLimit);
                    onPageChange?.(0);
                  }}
                  className="bg-surface border border-hairline rounded px-1.5 py-0.5 text-gray-200 focus:outline-none focus:border-mongo"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                  <option value={500}>500</option>
                </select>
              </div>

              <div className="h-3 w-[1px] bg-hairline" />

              {/* Jump to page */}
              <div className="flex items-center gap-1">
                <span className="text-gray-500">Page</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const targetPage = Number(e.target.value);
                    if (targetPage >= 1 && targetPage <= totalPages) {
                      onPageChange?.((targetPage - 1) * pageSize);
                    }
                  }}
                  className="w-12 px-1 py-0.5 bg-surface border border-hairline rounded text-center text-white focus:outline-none focus:border-mongo"
                />
                <span className="text-gray-500">of {totalPages}</span>
              </div>

              <div className="h-3 w-[1px] bg-hairline" />

              {/* Nav Buttons */}
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => onPageChange?.(0)}
                  disabled={currentPage <= 1 || isLoading}
                  className="p-1 rounded hover:bg-surface text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                  title="First Page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onPageChange?.(Math.max(0, currentSkip - pageSize))}
                  disabled={currentPage <= 1 || isLoading}
                  className="p-1 rounded hover:bg-surface text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onPageChange?.(currentSkip + pageSize)}
                  disabled={currentPage >= totalPages || isLoading}
                  className="p-1 rounded hover:bg-surface text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onPageChange?.((totalPages - 1) * pageSize)}
                  disabled={currentPage >= totalPages || isLoading}
                  className="p-1 rounded hover:bg-surface text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                  title="Last Page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
