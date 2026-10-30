import React, { useState } from "react";
import { BackupConfig } from "../../types";
import { HardDriveDownload, X, AlertTriangle, Play, FolderArchive } from "lucide-react";

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunBackup: (config: BackupConfig) => Promise<void>;
  connectionId: string;
  defaultDb: string;
  availableCollections: string[];
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  onRunBackup,
  connectionId,
  defaultDb,
  availableCollections,
}) => {
  const [database, setDatabase] = useState<string>(defaultDb || "store_db");
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [outputPath, setOutputPath] = useState<string>(
    `backup_${defaultDb || "store_db"}_${new Date().toISOString().replace(/[:.]/g, "-")}.dump.gz`
  );
  const [gzip, setGzip] = useState<boolean>(true);
  const [archive, setArchive] = useState<boolean>(true);
  const [queryFilter, setQueryFilter] = useState<string>("");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleCollection = (col: string) => {
    setSelectedCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const handleBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunning(true);
    setError(null);
    try {
      await onRunBackup({
        connection_id: connectionId,
        database,
        collections: selectedCols,
        query_filter: queryFilter.trim() ? queryFilter.trim() : undefined,
        output_path: outputPath.trim(),
        gzip,
        archive,
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
            <div className="p-1.5 rounded-lg bg-surface border border-hairline text-mongo">
              <HardDriveDownload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Create Database Backup (mongodump)
              </h2>
              <p className="text-[11px] text-gray-400">
                Generate compressed archive using official database tools
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
        <form onSubmit={handleBackup} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Target Database
            </label>
            <input
              type="text"
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              required
              className="w-full px-3 py-1.5 bg-surface border border-hairline rounded-md text-xs font-mono text-white focus:outline-none focus:border-mongo"
            />
          </div>

          {/* Collections selective list */}
          {availableCollections.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-300">
                  Target Collections (Leave unselected for all)
                </label>
                <span className="text-[10px] text-gray-500 font-mono">
                  {selectedCols.length > 0 ? `${selectedCols.length} selected` : "All collections"}
                </span>
              </div>
              <div className="max-h-28 overflow-y-auto p-2 bg-surface/50 border border-hairline rounded-md space-y-1">
                {availableCollections.map((col) => {
                  const isChecked = selectedCols.includes(col);
                  return (
                    <label
                      key={col}
                      className="flex items-center gap-2 text-xs font-mono text-gray-300 cursor-pointer hover:text-white"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCollection(col)}
                        className="rounded bg-surface border-hairline text-mongo focus:ring-0"
                      />
                      <span>{col}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Destination Archive Path */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Output File Path (.dump.gz)
            </label>
            <div className="relative">
              <FolderArchive className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={outputPath}
                onChange={(e) => setOutputPath(e.target.value)}
                required
                className="w-full pl-8 pr-3 py-1.5 bg-surface border border-hairline rounded-md text-xs font-mono text-white focus:outline-none focus:border-mongo"
              />
            </div>
          </div>

          {/* Optional Query Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Query Filter (Optional)
            </label>
            <input
              type="text"
              value={queryFilter}
              onChange={(e) => setQueryFilter(e.target.value)}
              placeholder='{ "status": "active" }'
              className="w-full px-3 py-1.5 bg-surface border border-hairline rounded-md text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-mongo"
            />
          </div>

          {/* Flags */}
          <div className="flex items-center gap-4 text-xs text-gray-300 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={gzip}
                onChange={(e) => setGzip(e.target.checked)}
                className="rounded bg-surface border-hairline text-mongo focus:ring-0"
              />
              <span>Gzip Compression (--gzip)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={archive}
                onChange={(e) => setArchive(e.target.checked)}
                className="rounded bg-surface border-hairline text-mongo focus:ring-0"
              />
              <span>Single Archive (--archive)</span>
            </label>
          </div>

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
              className="px-4 py-1.5 rounded-md bg-mongo hover:bg-emerald-600 text-xs font-semibold text-gray-950 flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${isRunning ? "animate-spin" : ""}`} />
              <span>{isRunning ? "Dumping Data..." : "Start Backup"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
