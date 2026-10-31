import React, { useState, useEffect } from "react";
import { ArchiveMetadata, BackupFileInfo, RestoreConfig } from "../../types";
import {
  FolderArchive,
  X,
  AlertTriangle,
  Play,
  FileSearch,
  CheckCircle2,
  HardDrive,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { listBackupFiles, openBackupDirectory } from "../../services/tauri";
import { FilePickerButton } from "../ui/FilePickerButton";
import { Checkbox } from "../ui/Checkbox";

interface RestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunRestore: (config: RestoreConfig) => Promise<void>;
  onInspectArchive: (path: string) => Promise<ArchiveMetadata>;
  onEnsureTool?: (tool: string) => Promise<string>;
  connectionId: string;
  defaultDb: string;
  isProduction?: boolean;
}

export const RestoreModal: React.FC<RestoreModalProps> = ({
  isOpen,
  onClose,
  onRunRestore,
  onInspectArchive,
  onEnsureTool,
  connectionId,
  defaultDb,
  isProduction,
}) => {
  const [inputPath, setInputPath] = useState<string>("data_feed.dump.gz");
  const [database, setDatabase] = useState<string>(defaultDb || "store_db");
  const [dropExisting, setDropExisting] = useState<boolean>(true);
  const [stopOnError, setStopOnError] = useState<boolean>(false);
  const [nsInclude, setNsInclude] = useState<string>("");
  const [customArgs, setCustomArgs] = useState<string>("");

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
      if (onEnsureTool) {
        await onEnsureTool("mongorestore").catch(() => {});
      }
      await onRunRestore({
        connection_id: connectionId,
        database: database.trim(),
        input_path: inputPath.trim(),
        drop_existing: dropExisting,
        ns_include: nsInclude.trim() ? nsInclude.trim() : undefined,
        custom_args: customArgs.trim() ? customArgs.trim() : undefined,
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
    <div className="modal-backdrop">
      <div className="modal-shell max-w-xl max-h-[90vh]">
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3 min-w-0">
            <FolderArchive className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="modal-title">
                  Restore Database Archive
                </h2>
                <span className="badge-tag">
                  mongorestore
                </span>
              </div>
              <p className="modal-subtitle">
                1-click selection from managed backups or custom file path
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="btn-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleRestore} className="flex-1 flex flex-col overflow-hidden">
          <div className="modal-body">
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
                  className="text-[11px] text-mongo hover:underline font-mono flex items-center gap-1 transition-colors"
                  title="Open backup folder in File Explorer"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open Folder</span>
                </button>
              </div>

              {backupFiles.length > 0 ? (
                <div className="max-h-32 overflow-y-auto border border-hairline rounded-lg divide-y divide-hairline bg-modal-recessed">
                  {backupFiles.map((file) => {
                    const isSelected = inputPath === file.path;
                    return (
                      <div
                        key={file.path}
                        onClick={() => handleSelectFile(file)}
                        className={`p-2.5 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                          isSelected ? "bg-mongo/10 text-white" : "hover:bg-white/[0.04] text-gray-300"
                        }`}
                      >
                        <div className="truncate flex-1 pr-2">
                          <div className="font-mono text-xs truncate">{file.filename}</div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            {file.created_at} · {(file.size_bytes / (1024 * 1024)).toFixed(2)} MB
                          </div>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-hairline text-mongo shrink-0">
                          {isSelected ? "Selected" : "Pick"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 text-[11px] text-gray-500 border border-hairline rounded-lg bg-modal-recessed text-center font-mono">
                  No backup files found in default storage folder.
                </div>
              )}
            </div>

            {/* Source Archive Path & Manual Inspector */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Selected Archive File Path
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputPath}
                  onChange={(e) => setInputPath(e.target.value)}
                  placeholder="Path to .dump.gz file"
                  required
                  className="flex-1 px-3 py-1.5 bg-modal-recessed border border-hairline rounded-md text-xs font-mono text-white focus:outline-none focus:border-mongo"
                />
                <FilePickerButton
                  accept=".gz,.dump,.*"
                  title="Select Archive File"
                  onSelect={(path) => {
                    setInputPath(path);
                    onInspectArchive(path).then(setArchiveMeta).catch(() => {});
                  }}
                />
                <button
                  type="button"
                  onClick={handleInspect}
                  disabled={isInspecting || !inputPath.trim()}
                  className="px-3 py-1.5 rounded-md bg-surface hover:bg-white/[0.06] text-xs font-mono text-gray-300 border border-hairline flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-50"
                >
                  <FileSearch className={`w-3.5 h-3.5 ${isInspecting ? "animate-spin text-mongo" : ""}`} />
                  <span>{isInspecting ? "Inspecting..." : "Inspect"}</span>
                </button>
              </div>
            </div>

            {/* Archive Metadata Banner */}
            {archiveMeta && (
              <div className="p-3.5 rounded-lg bg-surface border border-hairline text-xs font-mono space-y-1">
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
              <label htmlFor="restore-target-db-input" className="block text-xs font-medium text-gray-300 mb-1.5">
                Target Database Name
              </label>
              <input
                id="restore-target-db-input"
                type="text"
                value={database}
                onChange={(e) => setDatabase(e.target.value)}
                placeholder="Target Database Name (e.g. store_db)"
                required
                className="w-full px-3 py-2 bg-modal-recessed border border-hairline rounded-md text-xs font-mono text-white focus:outline-none focus:border-mongo"
              />
            </div>

            {/* Namespace Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Namespace Filter (--nsInclude, Optional)
              </label>
              <input
                type="text"
                value={nsInclude}
                onChange={(e) => setNsInclude(e.target.value)}
                placeholder="e.g. store_db.orders"
                className="w-full px-3 py-1.5 bg-modal-recessed border border-hairline rounded-md text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-mongo"
              />
            </div>

            {/* Custom CLI Arguments (Optional) */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Custom CLI Arguments (Optional)
              </label>
              <input
                type="text"
                value={customArgs}
                onChange={(e) => setCustomArgs(e.target.value)}
                placeholder="e.g. --noIndexRestore --verbose"
                className="w-full px-3 py-1.5 bg-modal-recessed border border-hairline rounded-md text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-mongo"
              />
              <p className="text-[10px] text-gray-500 mt-1 font-mono">
                Additional options passed directly to mongorestore.
              </p>
            </div>

            {/* Flags */}
            <div className="space-y-2 pt-1 text-xs text-gray-300">
              <div>
                <Checkbox
                  checked={dropExisting}
                  onChange={(c) => setDropExisting(c)}
                  label={
                    <span className={dropExisting ? "text-guard font-semibold" : ""}>
                      Drop existing collections before restoring (--drop)
                    </span>
                  }
                />
              </div>

              <div>
                <Checkbox
                  checked={stopOnError}
                  onChange={(c) => setStopOnError(c)}
                  label="Halt on first error encountered (--stopOnError)"
                />
              </div>
            </div>

            {/* Production Warning if --drop is enabled */}
            {dropExisting && isProduction && (
              <div className="p-3 rounded-lg bg-surface border border-guard/30 text-red-200 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-guard shrink-0" />
                <span>Production Guard: Dropping collections in Production will require confirmation.</span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-surface border border-guard/30 text-red-300 text-xs flex items-center gap-2 select-text cursor-text">
                <AlertTriangle className="w-4 h-4 text-guard shrink-0" />
                <span className="break-all">{error}</span>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={isRunning}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRunning || !inputPath.trim()}
              className="btn-primary"
            >
              <Play className={`w-3.5 h-3.5 ${isRunning ? "animate-spin" : ""}`} />
              <span>{isRunning ? "Restoring Archive..." : "Run Restore"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
