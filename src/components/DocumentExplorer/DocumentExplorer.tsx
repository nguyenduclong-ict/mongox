import React, { useState, useEffect, useCallback } from "react";
import { QueryBar } from "./QueryBar";
import { TableView } from "./TableView";
import { TreeView } from "./TreeView";
import { RawJsonView } from "./RawJsonView";
import { DocumentModal } from "./DocumentModal";
import { ExplainPlanModal } from "./ExplainPlanModal";
import {
  executeQuery,
  explainQuery,
  insertDocument,
  updateDocument,
  deleteDocument,
} from "../../services/tauri";
import { ExplainResult, QueryResult } from "../../types";
import { ConfirmationModal } from "../ui/ConfirmationModal";
import { ToastContainer, ToastMessage } from "../ui/Toast";
import {
  Table as TableIcon,
  FolderTree,
  FileCode,
  Plus,
  RefreshCw,
  Database,
  Layers,
} from "lucide-react";

interface DocumentExplorerProps {
  connectionId: string | null;
  database: string | null;
  collection: string | null;
  onSelectDatabase?: (db: string) => void;
  onRequireProductionConfirm?: (actionName: string, entityName: string, onConfirmed: () => Promise<void>) => void;
  isProduction?: boolean;
}

export const DocumentExplorer: React.FC<DocumentExplorerProps> = ({
  connectionId,
  database,
  collection,
  onRequireProductionConfirm: _onRequireProductionConfirm,
  isProduction,
}) => {
  const [viewMode, setViewMode] = useState<"table" | "tree" | "raw">("table");
  const [filter, setFilter] = useState<string>("");
  const [sort, setSort] = useState<string>("");
  const [projection, setProjection] = useState<string>("");
  const [limit, setLimit] = useState<number>(50);
  const [skip, setSkip] = useState<number>(0);

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (
    type: "info" | "success" | "loading" | "error",
    message: string,
    id?: string
  ): string => {
    const toastId = id || Math.random().toString(36).substring(2, 9);
    setToasts((prev) => {
      const filtered = prev.filter((t) => t.id !== toastId);
      return [...filtered, { id: toastId, type, message }];
    });
    return toastId;
  };

  // Reset pagination and selection on collection change
  useEffect(() => {
    setSkip(0);
    setSelectedIds(new Set());
  }, [database, collection]);

  const [queryResult, setQueryResult] = useState<QueryResult>({
    documents: [],
    total_count: 0,
    page: 1,
    page_size: 50,
    elapsed_ms: 0,
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Document Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingDoc, setEditingDoc] = useState<Record<string, unknown> | null>(null);

  // Explain Plan state
  const [explainResult, setExplainResult] = useState<ExplainResult | null>(null);
  const [isExplainOpen, setIsExplainOpen] = useState<boolean>(false);

  const runQuery = useCallback(
    async (override?: { skip?: number; sort?: string; filter?: string; limit?: number }) => {
      if (!connectionId || !database || !collection) return;

      const actualSkip = override?.skip !== undefined ? override.skip : skip;
      const actualSort = override?.sort !== undefined ? override.sort : sort;
      const actualFilter = override?.filter !== undefined ? override.filter : filter;
      const actualLimit = override?.limit !== undefined ? override.limit : limit;

      setIsLoading(true);
      setError(null);
      try {
        const res = await executeQuery({
          connection_id: connectionId,
          database,
          collection,
          filter: actualFilter.trim(),
          sort: actualSort.trim() ? actualSort.trim() : undefined,
          projection: projection.trim() ? projection.trim() : undefined,
          limit: actualLimit,
          skip: actualSkip,
        });
        setQueryResult(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    },
    [connectionId, database, collection, filter, sort, projection, limit, skip]
  );

  const handleExecute = () => {
    setSkip(0);
    runQuery({ skip: 0 });
  };

  useEffect(() => {
    if (connectionId && database && collection) {
      runQuery();
    }
  }, [connectionId, database, collection, skip]);

  const handleExplain = async () => {
    if (!connectionId || !database || !collection) return;
    try {
      const res = await explainQuery({
        connection_id: connectionId,
        database,
        collection,
        filter: filter.trim(),
        sort: sort.trim() ? sort.trim() : undefined,
        projection: projection.trim() ? projection.trim() : undefined,
        limit,
        skip,
      });
      setExplainResult(res);
      setIsExplainOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleOpenInsert = () => {
    setEditingDoc(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (doc: Record<string, unknown>) => {
    setEditingDoc(doc);
    setIsModalOpen(true);
  };

  const handleSaveDocument = async (docJson: string, id?: string) => {
    if (!connectionId || !database || !collection) return;

    if (id) {
      // Update
      await updateDocument(connectionId, database, collection, id, docJson);
    } else {
      // Insert
      await insertDocument(connectionId, database, collection, docJson);
    }
    await runQuery();
  };

  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortDir, setSortDir] = useState<1 | -1 | undefined>(undefined);

  const handleSortChange = (field: string, direction: 1 | -1 | 0) => {
    let newSortStr = "";
    if (direction === 0) {
      setSortField(undefined);
      setSortDir(undefined);
      setSort("");
      newSortStr = "";
    } else {
      setSortField(field);
      setSortDir(direction);
      newSortStr = JSON.stringify({ [field]: direction });
      setSort(newSortStr);
    }
    setSkip(0);
    runQuery({ sort: newSortStr, skip: 0 });
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (select: boolean) => {
    if (select) {
      const ids = queryResult.documents.map((d) => {
        const rawId = d["_id"];
        return typeof rawId === "object" && rawId !== null && "$oid" in rawId
          ? String((rawId as Record<string, unknown>)["$oid"])
          : String(rawId || "");
      });
      setSelectedIds(new Set(ids));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleCopySelectedIds = () => {
    navigator.clipboard.writeText(JSON.stringify(Array.from(selectedIds)));
    addToast("success", `Copied ${selectedIds.size} IDs.`);
  };

  const handleCopySelectedJson = () => {
    const selectedDocs = queryResult.documents.filter((d) => {
      const rawId = d["_id"];
      const idStr =
        typeof rawId === "object" && rawId !== null && "$oid" in rawId
          ? String((rawId as Record<string, unknown>)["$oid"])
          : String(rawId);
      return selectedIds.has(idStr);
    });
    navigator.clipboard.writeText(JSON.stringify(selectedDocs, null, 2));
    addToast("success", `Copied ${selectedDocs.length} JSON documents.`);
  };

  const handleDeleteDocument = (id: string) => {
    setSingleDeleteId(id);
  };

  const confirmSingleDelete = async () => {
    if (!connectionId || !database || !collection || !singleDeleteId) return;
    await deleteDocument(connectionId, database, collection, singleDeleteId);
    setSingleDeleteId(null);
    await runQuery();
  };

  const confirmBulkDelete = async () => {
    if (!connectionId || !database || !collection) return;
    for (const id of Array.from(selectedIds)) {
      await deleteDocument(connectionId, database, collection, id);
    }
    setSelectedIds(new Set());
    setBulkDeleteConfirmOpen(false);
    await runQuery();
  };

  const handleUpdateCell = async (docId: string, field: string, newValue: unknown) => {
    if (!connectionId || !database || !collection) return;
    const patch = JSON.stringify({ [field]: newValue });
    await updateDocument(connectionId, database, collection, docId, patch);
    await runQuery();
  };

  if (!connectionId || !database || !collection) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-canvas">
        <div className="w-12 h-12 rounded-xl bg-panel border border-hairline flex items-center justify-center text-mongo mb-3">
          <Layers className="w-6 h-6" />
        </div>
        <h2 className="text-sm font-semibold text-white tracking-tight">
          Select a Collection to Explore
        </h2>
        <p className="text-xs text-gray-400 max-w-sm mt-1">
          Choose a database and collection from the left sidebar to inspect documents, run queries, and modify data.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-canvas overflow-hidden">
      {/* Explorer Top Toolbar */}
      <div className="h-11 px-4 bg-panel border-b border-hairline flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-mongo" />
          <span className="text-xs font-mono text-gray-400">{database}</span>
          <span className="text-gray-600">/</span>
          <span className="text-xs font-semibold text-white font-mono">{collection}</span>
        </div>

        {/* View Mode Switcher & Actions */}
        <div className="flex items-center gap-2">
          {/* Mode Pill */}
          <div className="flex items-center p-0.5 rounded-lg bg-surface border border-hairline">
            <button
              onClick={() => setViewMode("table")}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === "table"
                  ? "bg-panel text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
              title="Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              onClick={() => setViewMode("tree")}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === "tree"
                  ? "bg-panel text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
              title="Interactive Tree View"
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tree</span>
            </button>
            <button
              onClick={() => setViewMode("raw")}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === "raw"
                  ? "bg-panel text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
              title="Raw JSON View"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">JSON</span>
            </button>
          </div>

          <button
            onClick={() => runQuery()}
            className="p-1.5 rounded-md hover:bg-surface text-gray-400 hover:text-white border border-transparent hover:border-hairline transition-colors"
            title="Refresh Results"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-mongo" : ""}`} />
          </button>

          <button
            onClick={handleOpenInsert}
            className="px-2.5 py-1 rounded-md bg-mongo hover:bg-emerald-600 text-xs font-semibold text-gray-950 flex items-center gap-1 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Insert Document</span>
          </button>
        </div>
      </div>

      {/* Query Bar */}
      <QueryBar
        filter={filter}
        setFilter={setFilter}
        sort={sort}
        setSort={setSort}
        projection={projection}
        setProjection={setProjection}
        limit={limit}
        setLimit={setLimit}
        skip={skip}
        onPageChange={(newSkip) => setSkip(newSkip)}
        onExecute={handleExecute}
        onExplain={handleExplain}
        isLoading={isLoading}
        elapsedMs={queryResult.elapsed_ms}
        totalCount={queryResult.total_count}
        selectedCount={selectedIds.size}
        onCopySelectedIds={handleCopySelectedIds}
        onCopySelectedJson={handleCopySelectedJson}
        onDeleteSelected={() => setBulkDeleteConfirmOpen(true)}
        onDeselectAll={() => setSelectedIds(new Set())}
      />

      {/* Error Message */}
      {error && (
        <div className="bg-guard/10 border-b border-guard/30 px-4 py-2 text-red-300 text-xs font-mono select-text cursor-text">
          Query Error: {error}
        </div>
      )}

      {/* View Content Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {viewMode === "table" && (
          <TableView
            documents={queryResult.documents}
            onEdit={handleOpenEdit}
            onDelete={handleDeleteDocument}
            onUpdateCell={handleUpdateCell}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onSortChange={handleSortChange}
            currentSortField={sortField}
            currentSortDir={sortDir}
            onToast={addToast}
          />
        )}
        {viewMode === "tree" && (
          <TreeView
            documents={queryResult.documents}
            onEdit={handleOpenEdit}
          />
        )}
        {viewMode === "raw" && (
          <RawJsonView documents={queryResult.documents} />
        )}
      </div>

      {/* Document Insertion / Editing Modal */}
      <DocumentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveDocument}
        document={editingDoc}
      />

      {/* Visual Explain Plan Modal */}
      <ExplainPlanModal
        isOpen={isExplainOpen}
        onClose={() => setIsExplainOpen(false)}
        explain={explainResult}
        database={database}
        collection={collection}
      />

      {/* Single Document Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={singleDeleteId !== null}
        onClose={() => setSingleDeleteId(null)}
        onConfirm={confirmSingleDelete}
        title="Delete Document?"
        message={`This action cannot be undone. The document with ID ${singleDeleteId} will be permanently removed from ${database}.${collection}.`}
        confirmLabel="Delete Document"
        confirmVariant="danger"
        entityName={collection}
        isProduction={isProduction}
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={bulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        onConfirm={confirmBulkDelete}
        title={`Delete ${selectedIds.size} Selected Documents?`}
        message={`This action cannot be undone. All ${selectedIds.size} selected documents will be permanently removed from ${database}.${collection}.`}
        confirmLabel={`Delete ${selectedIds.size} Documents`}
        confirmVariant="danger"
        entityName={collection}
        isProduction={isProduction}
      />

      {/* Floating Bottom-Right Toast Notifications */}
      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
};
