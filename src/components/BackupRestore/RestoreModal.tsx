import React, { useState, useEffect } from "react";
import { ArchiveMetadata, BackupFileInfo, RestoreConfig } from "../../types";
import {
  FolderArchive,
  X,
  Play,
  ShieldAlert,
  FileSearch,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  HardDrive,
  Clock,
} from "lucide-react";
import { listBackupFiles, openBackupDirectory } from "../../services/tauri";

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
  const [inputPath, setInputPath] = useState<string>("");
  const [database, setDatabase] = useState<string>(defaultDb || "store_db");
  const [dropExisting, setDropExisting] = useState<boolean>(false);
  const [stopOnError, setStopOnError] = useState<boolean>(true);
  const [nsInclude, setNsInclude] = useState<string>("");

  const [backupFiles, setBackupFiles] = useState<BackupFileInfo[]>([]);
  const [archiveMeta, setArchiveMeta] = useState<ArchiveMetadata | null>(null);
  const [isInspecting, setIsInspecting] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDatabase(defaultDb || "store_db");
      listBackupFiles().then((files) => {
        setBackupFiles(files);
        if (files.length > 0) {
          setInputPath(files[0].path);
          onInspectArchive(files[0].path)
            .then(setArchiveMeta)
            .catch(() => {});
        }
      });
    }
  }, [isOpen, defaultDb, onInspectArchive]);

  if (!isOpen) return null;

  const handleSelectFile = async (file: BackupFileInfo) => {
    setInputPath(file.path);
    setIsInspecting(true);
    setError(null);
    try {
      const meta = await onInspectArchive(file.path);
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

  const handleInspect = async () => {
    if (!inputPath.trim()) return;
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
      <div className="w-full max-w-xl bg-modal border border-white/10 rounded-xl shadow-modal text-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
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
                1-click selection from managed backups or custom file path
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
        <form onSubmit={handleRestore} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Detected Backups List on Disk */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-mongo" />
                <span>Detected Backups in Managed Storage</span>
              </label>
              <button
                type="button"
                onClick={() => openBackupDirectory()}
                className="text-[11px] text-mongo hover:text-emerald-400 font-mono flex items-center gap-1 transition-colors"
                title="Open backup folder in Windows Explorer"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Open Folder</span>
              </button>
            </div>

            {backupFiles.length > 0 ? (
              <div className="max-h-32 overflow-y-auto border border-hairline rounded-lg divide-y divide-hairline bg-surface/50">
                {backupFiles.map((file) => {
                  const isSelected = inputPath === file.path;
                  return (
                    <div
                      key={file.path}
                      onClick={() => handleSelectFile(file)}
                      className={`p-2 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-mongo/10 border-l-2 border-l-mongo text-white font-medium"
                          : "hover:bg-surface text-gray-300"
                      }`}
                    >
                      <div className="truncate max-w-sm">
                        <div className="truncate font-mono">{file.filename}</div>
                        <div className="text-[10px] text-gray-500 font-mono flex items-center gap-2">
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(file.created_at).toLocaleDateString()}
                          </span>
                          <span>•</span>
                          <span>{(file.size_bytes / (1024 * 1024)).toFixed(2)} MB</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-hairline text-mongo shrink-0">
                        {isSelected ? "Selected" : "Pick"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 text-[11px] text-gray-500 border border-hairline rounded-lg bg-surface/30 text-center font-mono">
                No backup files found in default storage folder.
              </div>
            )}
          </div>

          {/* Source Archive Path & Manual Inspector */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Selected Archive File Path
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputPath}
                onChange={(e) => setInputPath(e.target.value)}
                placeholder="Path to .dump.gz file"
                required
                className="flex-1 px-3 py-1.5 bg-surface border border-hairline rounded-md text-xs font-mono text-white focus:outline-none focus:border-mongo"
              />
              <button
                type="button"
                onClick={handleInspect}
                disabled={isInspecting || !inputPath.trim()}
                className="px-3 py-1.5 rounded-md bg-surface hover:bg-surface-hover text-xs font-mono text-gray-300 border border-hairline flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-50"
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
                <span>Archive Metadata Validated</span>
              </div>
              <div className="text-gray-400 text-[11px] flex justify-between">
                <span>Archive Size: {(archiveMeta.size_bytes / (1024 * 1024)).toFixed(2)} MB</span>
                <span>Detected Target DB: {archiveMeta.detected_database || "(Universal)"}</span>
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
              disabled={isRunning || !inputPath.trim()}
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
