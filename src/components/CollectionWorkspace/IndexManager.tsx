import React, { useState, useEffect, useCallback } from "react";
import { IndexInfo } from "../../types";
import { listIndexes, createIndex, dropIndex } from "../../services/tauri";
import {
  Zap,
  Plus,
  Trash2,
  RefreshCw,
  AlertTriangle,
  HardDrive,
  Key,
} from "lucide-react";
import { Checkbox } from "../ui/Checkbox";

interface IndexManagerProps {
  connectionId: string;
  database: string;
  collection: string;
  isProduction?: boolean;
  onRequireProductionConfirm?: (
    actionName: string,
    entityName: string,
    onConfirmed: () => Promise<void>
  ) => void;
}

export const IndexManager: React.FC<IndexManagerProps> = ({
  connectionId,
  database,
  collection,
  isProduction,
  onRequireProductionConfirm,
}) => {
  const [indexes, setIndexes] = useState<IndexInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // New Index Form state
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [fieldName, setFieldName] = useState<string>("");
  const [direction, setDirection] = useState<number>(1);
  const [isUnique, setIsUnique] = useState<boolean>(false);
  const [isSparse, setIsSparse] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchIndexes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listIndexes(connectionId, database, collection);
      setIndexes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [connectionId, database, collection]);

  useEffect(() => {
    fetchIndexes();
  }, [fetchIndexes]);

  const handleCreateIndex = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldName.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await createIndex({
        connection_id: connectionId,
        database,
        collection,
        keys: [[fieldName.trim(), direction]],
        name: customName.trim() ? customName.trim() : undefined,
        unique: isUnique,
        sparse: isSparse,
      });
      setFieldName("");
      setCustomName("");
      setIsCreating(false);
      await fetchIndexes();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDropIndex = async (indexName: string) => {
    if (indexName === "_id_") return;

    const execute = async () => {
      await dropIndex({
        connection_id: connectionId,
        database,
        collection,
        index_name: indexName,
      });
      await fetchIndexes();
    };

    if (isProduction && onRequireProductionConfirm) {
      onRequireProductionConfirm("Drop Collection Index", indexName, execute);
    } else {
      await execute();
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 KB";
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="flex-1 flex flex-col bg-canvas overflow-y-auto p-6 space-y-5">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-hairline shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-surface border border-hairline text-mongo">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight">
              Collection Indexes ({indexes.length})
            </h2>
            <p className="text-[11px] text-gray-400">
              Manage single-field, compound, and unique index structures for {database}.{collection}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchIndexes}
            disabled={isLoading}
            className="p-1.5 rounded-md hover:bg-surface text-gray-400 hover:text-white border border-transparent hover:border-hairline transition-colors"
            title="Refresh Indexes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-mongo" : ""}`} />
          </button>

          <button
            onClick={() => setIsCreating(!isCreating)}
            className="px-3 py-1.5 rounded-md bg-mongo hover:bg-emerald-600 text-xs font-semibold text-gray-950 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Index</span>
          </button>
        </div>
      </div>

      {/* Create Index Form */}
      {isCreating && (
        <form
          onSubmit={handleCreateIndex}
          className="p-4 bg-panel border border-mongo/30 rounded-xl space-y-3 animate-in fade-in duration-150 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white">Create New Index</h3>
            <span className="text-[10px] text-gray-400 font-mono">
              mongosh coll.createIndex()
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Index Field Name
              </label>
              <input
                type="text"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder="e.g. email or createdAt"
                required
                className="w-full px-3 py-1.5 bg-surface border border-hairline rounded-md text-xs font-mono text-white focus:outline-none focus:border-mongo"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Index Order
              </label>
              <select
                value={direction}
                onChange={(e) => setDirection(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-surface border border-hairline rounded-md text-xs font-mono text-white focus:outline-none focus:border-mongo"
              >
                <option value={1}>1 (Ascending)</option>
                <option value={-1}>-1 (Descending)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Custom Index Name (Optional)
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="auto-generated if empty"
                className="w-full px-3 py-1.5 bg-surface border border-hairline rounded-md text-xs font-mono text-white focus:outline-none focus:border-mongo"
              />
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-gray-300 pt-1">
            <Checkbox
              checked={isUnique}
              onChange={(c) => setIsUnique(c)}
              label="Unique Constraint"
            />
            <Checkbox
              checked={isSparse}
              onChange={(c) => setIsSparse(c)}
              label="Sparse Index"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 rounded-md bg-transparent hover:bg-surface text-xs font-medium text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-md bg-mongo hover:bg-emerald-600 text-xs font-semibold text-gray-950 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Building Index..." : "Create Index"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 rounded-lg bg-guard/10 border border-guard/30 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-guard shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {/* Indexes List Table */}
      <div className="bg-panel border border-hairline rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-surface/50 border-b border-hairline text-[10px] font-mono text-gray-400 uppercase tracking-wider">
              <th className="py-2.5 px-4">Index Name</th>
              <th className="py-2.5 px-4">Key Specification</th>
              <th className="py-2.5 px-4">Properties</th>
              <th className="py-2.5 px-4">Memory Size</th>
              <th className="py-2.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline font-mono text-[11px]">
            {indexes.map((idx) => {
              const isDefaultId = idx.name === "_id_";
              return (
                <tr key={idx.name} className="hover:bg-surface/30 transition-colors">
                  <td className="py-2.5 px-4 font-semibold text-white">
                    <div className="flex items-center gap-1.5">
                      <span>{idx.name}</span>
                      {isDefaultId && (
                        <span className="text-[9px] px-1 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
                          PRIMARY
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-2.5 px-4 text-gray-300">
                    <div className="flex flex-wrap gap-1">
                      {idx.keys.map(([field, dir]) => (
                        <span
                          key={field}
                          className="px-1.5 py-0.5 rounded bg-surface border border-hairline text-gray-200"
                        >
                          {field}: {dir === 1 ? "ASC (1)" : "DESC (-1)"}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="py-2.5 px-4 text-gray-400">
                    <div className="flex items-center gap-1.5">
                      {idx.unique && (
                        <span className="px-1.5 py-0.2 rounded bg-mongo/10 text-mongo border border-mongo/30 text-[10px]">
                          UNIQUE
                        </span>
                      )}
                      {idx.sparse && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-400/10 text-amber-300 border border-amber-400/30 text-[10px]">
                          SPARSE
                        </span>
                      )}
                      {!idx.unique && !idx.sparse && <span>Standard</span>}
                    </div>
                  </td>

                  <td className="py-2.5 px-4 text-gray-400 flex items-center gap-1">
                    <HardDrive className="w-3 h-3 text-gray-500" />
                    <span>{formatBytes(idx.size_bytes)}</span>
                  </td>

                  <td className="py-2.5 px-4 text-right">
                    {!isDefaultId ? (
                      <button
                        onClick={() => handleDropIndex(idx.name)}
                        className="p-1 rounded hover:bg-surface text-gray-400 hover:text-guard transition-colors"
                        title="Drop Index"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-[10px] text-gray-600 italic">Locked</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
