import React, { useState, useEffect } from "react";
import { BackupConfig } from "../../types";
import {
  HardDriveDownload,
  X,
  AlertTriangle,
  Play,
  FolderArchive,
  ExternalLink,
} from "lucide-react";
import { getDefaultBackupDir, openBackupDirectory } from "../../services/tauri";
import { FilePickerButton } from "../ui/FilePickerButton";
import { Checkbox } from "../ui/Checkbox";

function formatToken(date: Date, token: string): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  switch (token.toLowerCase()) {
    case "{datetime}":
      return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
    case "{date}":
      return `${year}-${month}-${day}`;
    case "{time}":
      return `${hours}-${minutes}-${seconds}`;
    case "{timestamp}":
      return Math.floor(date.getTime() / 1000).toString();
    default:
      return token;
  }
}

function buildResolvedPath(
  directory: string,
  pattern: string,
  variables: { database?: string },
  extension: string
): string {
  const now = new Date();
  let name = pattern
    .replace(/\{database\}/gi, variables.database || "")
    .replace(/\{datetime\}/gi, formatToken(now, "{datetime}"))
    .replace(/\{date\}/gi, formatToken(now, "{date}"))
    .replace(/\{time\}/gi, formatToken(now, "{time}"))
    .replace(/\{timestamp\}/gi, formatToken(now, "{timestamp}"));

  if (!name.trim()) {
    name = `backup_${variables.database || "dump"}_${formatToken(now, "{datetime}")}`;
  }

  const cleanExt = extension.startsWith(".") ? extension : `.${extension}`;
  const fileName = name.endsWith(cleanExt) ? name : `${name}${cleanExt}`;

  const cleanDir = directory.trim();
  if (!cleanDir) return fileName;
  const sep = cleanDir.includes("/") ? "/" : "\\";
  return cleanDir.endsWith("/") || cleanDir.endsWith("\\")
    ? `${cleanDir}${fileName}`
    : `${cleanDir}${sep}${fileName}`;
}

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunBackup: (config: BackupConfig) => Promise<void>;
  onEnsureTool?: (tool: string) => Promise<string>;
  connectionId: string;
  defaultDb: string;
  availableCollections: string[];
  availableDatabases?: string[];
  onDatabaseChange?: (db: string) => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  onRunBackup,
  onEnsureTool,
  connectionId,
  defaultDb,
  availableCollections,
  availableDatabases = [],
  onDatabaseChange,
}) => {
  const [database, setDatabase] = useState<string>(
    defaultDb || (availableDatabases.length > 0 ? availableDatabases[0] : "store_db")
  );
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [outputDir, setOutputDir] = useState<string>("");
  const [fileNamePattern, setFileNamePattern] = useState<string>("backup_{database}_{datetime}");
  const [defaultDir, setDefaultDir] = useState<string>("");
  const [gzip, setGzip] = useState<boolean>(true);
  const [archive, setArchive] = useState<boolean>(true);
  const [customArgs, setCustomArgs] = useState<string>("");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDatabase(defaultDb || (availableDatabases.length > 0 ? availableDatabases[0] : "store_db"));
      getDefaultBackupDir().then((dir) => {
        setDefaultDir(dir);
        setOutputDir(dir);
      });
    }
  }, [isOpen, defaultDb, availableDatabases]);

  if (!isOpen) return null;

  const currentExt = gzip ? ".dump.gz" : ".dump";
  const previewResolvedPath = buildResolvedPath(outputDir || defaultDir, fileNamePattern, { database }, currentExt);

  const insertToken = (token: string) => {
    setFileNamePattern((prev) => `${prev}_${token}`);
  };

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
      if (onEnsureTool) {
        await onEnsureTool("mongodump");
      }
      await onRunBackup({
        connection_id: connectionId,
        database,
        collections: selectedCols,
        custom_args: customArgs.trim() ? customArgs.trim() : undefined,
        output_path: previewResolvedPath,
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
    <div className="fixed inset-0 bg-black/45 modal-backdrop-soft">
      <div className="modal-shell max-w-xl max-h-[90vh]">
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3 min-w-0">
            <HardDriveDownload className="w-4 h-4 text-mongo shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="modal-title">
                  Create Database Dump
                </h2>
                <span className="badge-tag">
                  mongodump
                </span>
              </div>
              <p className="modal-subtitle">
                Generate compressed archive stored in managed disk location
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
        <form onSubmit={handleBackup} className="flex-1 flex flex-col overflow-hidden">
          <div className="modal-body">
            {/* Target Database */}
            <div>
              <label className="form-label">
                Target Database
              </label>
              <select
                value={database}
                onChange={(e) => {
                  const nextDb = e.target.value;
                  setDatabase(nextDb);
                  setSelectedCols([]);
                  if (onDatabaseChange) onDatabaseChange(nextDb);
                }}
                required
                className="form-select"
              >
                {(() => {
                  const dbList = Array.from(
                    new Set([
                      ...(availableDatabases || []),
                      ...(database ? [database] : []),
                      ...(defaultDb ? [defaultDb] : []),
                    ])
                  ).filter(Boolean);

                  return dbList.length > 0 ? (
                    dbList.map((dbName) => (
                      <option key={dbName} value={dbName} className="bg-modal text-white">
                        {dbName}
                      </option>
                    ))
                  ) : (
                    <option value={database || "test_db"} className="bg-modal text-white">
                      {database || "test_db"}
                    </option>
                  );
                })()}
              </select>
            </div>

            {/* Collections selective list */}
            {availableCollections.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-medium text-gray-300">
                      Target Collections
                    </label>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {selectedCols.length > 0
                        ? `${selectedCols.length} selected`
                        : "All collections"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => setSelectedCols([...availableCollections])}
                      className="text-mongo hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-gray-600">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedCols([])}
                      className="text-gray-400 hover:text-white hover:underline"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                <div className="max-h-28 overflow-y-auto p-2.5 bg-modal-recessed border border-hairline rounded-md space-y-1.5">
                  {availableCollections.map((col) => {
                    const isChecked = selectedCols.includes(col);
                    return (
                      <div key={col} className="flex items-center">
                        <Checkbox
                          checked={isChecked}
                          onChange={() => toggleCollection(col)}
                          label={col}
                          className="font-mono text-xs"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Destination Output Directory & Dynamic Filename Pattern */}
            <div className="form-well">
              {/* Output Directory */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-300">
                    Destination Directory
                  </label>
                  <button
                    type="button"
                    onClick={() => openBackupDirectory()}
                    className="text-[11px] text-mongo hover:underline font-mono flex items-center gap-1 transition-colors"
                    title="Open default backup directory in File Explorer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open Folder</span>
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <FolderArchive className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={outputDir}
                      onChange={(e) => setOutputDir(e.target.value)}
                      required
                      placeholder={defaultDir || "Destination folder"}
                      className="form-input pl-8"
                    />
                  </div>
                  <FilePickerButton
                    directory
                    title="Select Destination Folder"
                    onSelect={(folder) => setOutputDir(folder)}
                  />
                </div>
                {defaultDir && (
                  <p className="text-[10px] text-gray-500 mt-1 font-mono truncate">
                    Default: {defaultDir}
                  </p>
                )}
              </div>

              {/* Filename Template Pattern */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-300">
                    File Name Pattern
                  </label>
                  <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono">
                    <span>Tokens:</span>
                    {["{database}", "{datetime}", "{date}", "{time}"].map((token) => (
                      <button
                        key={token}
                        type="button"
                        onClick={() => insertToken(token)}
                        className="px-1.5 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-hairline text-gray-300 hover:text-white transition-colors"
                        title={`Append ${token}`}
                      >
                        +{token}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={fileNamePattern}
                    onChange={(e) => setFileNamePattern(e.target.value)}
                    required
                    placeholder="backup_{database}_{datetime}"
                    className="flex-1 form-input"
                  />
                  <span className="text-xs font-mono text-mongo px-2.5 py-1.5 rounded bg-modal-recessed border border-hairline">
                    {currentExt}
                  </span>
                </div>
              </div>

              {/* Live Path Preview */}
              <div className="pt-2 border-t border-hairline">
                <div className="text-[10px] text-gray-500 font-mono mb-1">Computed Destination Path:</div>
                <div className="text-[11px] font-mono text-emerald-300 break-all select-all bg-modal-recessed px-3 py-2 rounded-md border border-hairline">
                  {previewResolvedPath}
                </div>
              </div>
            </div>

            {/* Custom CLI Arguments (Optional) */}
            <div>
              <label className="form-label">
                Custom CLI Arguments (Optional)
              </label>
              <input
                type="text"
                value={customArgs}
                onChange={(e) => setCustomArgs(e.target.value)}
                placeholder="e.g. --excludeCollection=temp --verbose"
                className="form-input"
              />
              <p className="text-[10px] text-gray-500 mt-1 font-mono">
                Additional arguments passed directly to mongodump.
              </p>
            </div>

            {/* Flags */}
            <div className="space-y-2 pt-1 text-xs text-gray-300">
              <Checkbox
                checked={gzip}
                onChange={(c) => setGzip(c)}
                label="Gzip Compression (--gzip)"
              />
              <Checkbox
                checked={archive}
                onChange={(c) => setArchive(c)}
                label="Single Archive (--archive)"
              />
            </div>

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
              disabled={isRunning}
              className="btn-primary"
            >
              <Play className={`w-3.5 h-3.5 ${isRunning ? "animate-spin" : ""}`} />
              <span>{isRunning ? "Dumping Data..." : "Start Dump"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
