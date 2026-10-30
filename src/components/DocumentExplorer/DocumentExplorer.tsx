import React, { useState, useEffect, useCallback } from "react";
import { QueryBar } from "./QueryBar";
import { TableView } from "./TableView";
import { TreeView } from "./TreeView";
import { RawJsonView } from "./RawJsonView";
import { DocumentModal } from "./DocumentModal";
import { executeQuery, insertDocument, updateDocument, deleteDocument } from "../../services/tauri";
import { QueryResult } from "../../types";
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
  onRequireProductionConfirm,
  isProduction,
}) => {
  const [viewMode, setViewMode] = useState<"table" | "tree" | "raw">("table");
  const [filter, setFilter] = useState<string>("");
  const [sort, setSort] = useState<string>("");
  const [projection, setProjection] = useState<string>("");
  const [limit, setLimit] = useState<number>(50);
  const [skip] = useState<number>(0);

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

  const runQuery = useCallback(async () => {
    if (!connectionId || !database || !collection) return;

    setIsLoading(true);
    setError(null);
    try {
      const res = await executeQuery({
        connection_id: connectionId,
        database,
        collection,
        filter: filter.trim(),
        sort: sort.trim() ? sort.trim() : undefined,
        projection: projection.trim() ? projection.trim() : undefined,
        limit,
        skip,
      });
      setQueryResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [connectionId, database, collection, filter, sort, projection, limit, skip]);

  useEffect(() => {
    if (connectionId && database && collection) {
      runQuery();
    }
  }, [connectionId, database, collection, runQuery]);

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

  const handleDeleteDocument = async (id: string) => {
    if (!connectionId || !database || !collection) return;

    const performDelete = async () => {
      await deleteDocument(connectionId, database, collection, id);
      await runQuery();
    };

    if (isProduction && onRequireProductionConfirm) {
      onRequireProductionConfirm("Delete Document", id, performDelete);
    } else {
      await performDelete();
    }
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
            onClick={runQuery}
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
        onExecute={runQuery}
        isLoading={isLoading}
        elapsedMs={queryResult.elapsed_ms}
        totalCount={queryResult.total_count}
      />

      {/* Error Message */}
      {error && (
        <div className="bg-guard/10 border-b border-guard/30 px-4 py-2 text-red-300 text-xs font-mono">
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
    </div>
  );
};
