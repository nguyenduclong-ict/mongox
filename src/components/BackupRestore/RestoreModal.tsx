import React, { useState } from "react";
import { ArchiveMetadata, RestoreConfig } from "../../types";
import { FolderArchive, X, Play, ShieldAlert, FileSearch, CheckCircle2, AlertTriangle } from "lucide-react";

interface RestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunRestore: (config: RestoreConfig) => Promise<void>;
  onInspectArchive: (path: string) => Promise<ArchiveMetadata>;
  connectionId: string;
  defaultDb: string;
  isProduction?: boolean;
}

export const RestoreModal: React.FC<RestoreModalProps> = ({
  isOpen,
  onClose,
  onRunRestore,
  onInspectArchive,
  connectionId,
  defaultDb,
  isProduction,
}) => {
  const [inputPath, setInputPath] = useState<string>("backup_store_db.dump.gz");
  const [database, setDatabase] = useState<string>(defaultDb || "store_db");
  const [dropExisting, setDropExisting] = useState<boolean>(false);
  const [stopOnError, setStopOnError] = useState<boolean>(true);
  const [nsInclude, setNsInclude] = useState<string>("");

  const [archiveMeta, setArchiveMeta] = useState<ArchiveMetadata | null>(null);
  const [isInspecting, setIsInspecting] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInspect = async () => {
    setIsInspecting(true);
    setError(null);
    try {
      const meta = await onInspectArchive(inputPath.trim());
      setArchiveMeta(meta);
      if (meta.detected_database) {
        setDatabase(meta.detected_database);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsInspecting(false);
    }
  };

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunning(true);
    setError(null);
    try {
      await onRunRestore({
        connection_id: connectionId,
        database: database.trim(),
        input_path: inputPath.trim(),
        drop_existing: dropExisting,
        ns_include: nsInclude.trim() ? nsInclude.trim() : undefined,
        stop_on_error: stopOnError,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-modal border border-white/10 rounded-xl shadow-modal text-gray-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-14 px-6 border-b border-hairline flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-surface border border-hairline text-emerald-400">
              <FolderArchive className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Restore Database Archive (mongorestore)
              </h2>
              <p className="text-[11px] text-gray-400">
                Inspect and unpack collections from a .dump.gz archive
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-surface text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleRestore} className="p-6 space-y-4">
          {/* Source Archive Path */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Source Archive File Path (.dump.gz)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputPath}
                onChange={(e) => setInputPath(e.target.value)}
                required
                className="flex-1 px-3 py-1.5 bg-surface border border-hairline rounded-md text-xs font-mono text-white focus:outline-none focus:border-mongo"
              />
              <button
                type="button"
                onClick={handleInspect}
                disabled={isInspecting}
                className="px-3 py-1.5 rounded-md bg-surface hover:bg-surface-hover text-xs font-mono text-gray-300 border border-hairline flex items-center gap-1.5 shrink-0 transition-colors"
              >
                <FileSearch className={`w-3.5 h-3.5 ${isInspecting ? "animate-spin text-mongo" : ""}`} />
                <span>{isInspecting ? "Inspecting..." : "Inspect"}</span>
              </button>
            </div>
          </div>

          {/* Archive Metadata Banner */}
          {archiveMeta && (
            <div className="p-3 rounded-lg bg-surface/80 border border-hairline text-xs font-mono space-y-1">
              <div className="flex items-center gap-1.5 text-mongo font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Valid MongoDB Archive Header Detected</span>
              </div>
              <div className="text-gray-400 text-[11px] flex justify-between">
                <span>Archive Size: {(archiveMeta.size_bytes / (1024 * 1024)).toFixed(2)} MB</span>
                <span>Detected DB: {archiveMeta.detected_database || "(Universal)"}</span>
              </div>
            </div>
          )}

          {/* Target Database */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Target Database Name
            </label>
            <input
              type="text"
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              required
              className="w-full px-3 py-1.5 bg-surface border border-hairline rounded-md text-xs font-mono text-white focus:outline-none focus:border-mongo"
            />
          </div>

          {/* Namespace Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Namespace Filter (--nsInclude, Optional)
            </label>
            <input
              type="text"
              value={nsInclude}
              onChange={(e) => setNsInclude(e.target.value)}
              placeholder="e.g. store_db.orders"
              className="w-full px-3 py-1.5 bg-surface border border-hairline rounded-md text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-mongo"
            />
          </div>

          {/* Flags */}
          <div className="space-y-2 pt-1 text-xs text-gray-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={dropExisting}
                onChange={(e) => setDropExisting(e.target.checked)}
                className="rounded bg-surface border-hairline text-guard focus:ring-0"
              />
              <span className={dropExisting ? "text-guard font-semibold" : ""}>
                Drop existing collections before restoring (--drop)
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={stopOnError}
                onChange={(e) => setStopOnError(e.target.checked)}
                className="rounded bg-surface border-hairline text-mongo focus:ring-0"
              />
              <span>Halt on first error encountered (--stopOnError)</span>
            </label>
          </div>

          {/* Production Warning if --drop is enabled */}
          {dropExisting && isProduction && (
            <div className="p-2.5 rounded bg-guard/10 border border-guard/30 text-red-200 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-guard shrink-0" />
              <span>Production Guard: Dropping collections in Production will require confirmation.</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-2.5 rounded bg-guard/10 border border-guard/30 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-guard shrink-0" />
              <span className="truncate">{error}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-hairline flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md bg-transparent hover:bg-surface text-xs font-medium text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRunning}
              className="px-4 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-600 text-xs font-semibold text-gray-950 flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${isRunning ? "animate-spin" : ""}`} />
              <span>{isRunning ? "Restoring..." : "Run Restore"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
