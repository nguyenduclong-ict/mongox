import React, { useState } from "react";
import { ConflictMode, ExportFormat, ImportConfig, ImportPreview } from "../../types";
import { Upload, X, Play, FileSearch, ShieldAlert } from "lucide-react";
import { FilePickerButton } from "../ui/FilePickerButton";
import { Checkbox } from "../ui/Checkbox";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunImport: (config: ImportConfig) => Promise<void>;
  onPreviewFile: (path: string, format: string) => Promise<ImportPreview>;
  onEnsureTool?: (tool: string) => Promise<string>;
  connectionId: string;
  database: string;
  collection: string;
  isProduction?: boolean;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onRunImport,
  onPreviewFile,
  onEnsureTool,
  connectionId,
  database,
  collection,
  isProduction,
}) => {
  const [inputPath, setInputPath] = useState<string>("data_feed.ndjson");
  const [format, setFormat] = useState<ExportFormat>("ndjson");
  const [conflictMode, setConflictMode] = useState<ConflictMode>("upsert");
  const [dropExisting, setDropExisting] = useState<boolean>(false);
  const [ignoreBlanks, setIgnoreBlanks] = useState<boolean>(true);

  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isPreviewing, setIsPreviewing] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePreview = async () => {
    setIsPreviewing(true);
    setError(null);
    try {
      const data = await onPreviewFile(inputPath.trim(), format);
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsImporting(true);
    setError(null);
    try {
      if (onEnsureTool) {
        await onEnsureTool("mongoimport").catch(() => {});
      }
      await onRunImport({
        connection_id: connectionId,
        database,
        collection,
        format,
        input_path: inputPath.trim(),
        conflict_mode: conflictMode,
        drop_existing: dropExisting,
        ignore_blanks: ignoreBlanks,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-modal border border-hairline rounded-xl shadow-modal text-gray-200 overflow-hidden flex flex-col font-sans max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-hairline flex items-center justify-between shrink-0 bg-modal">
          <div className="flex items-center gap-3 min-w-0">
            <Upload className="w-4 h-4 text-mongo shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white tracking-tight">
                  Import Data into {database}.{collection}
                </h2>
                <span className="text-[10px] font-mono font-medium text-gray-400 bg-surface px-1.5 py-0.5 rounded border border-hairline">
                  mongoimport
                </span>
              </div>
              <p className="text-[12px] text-gray-400 font-normal mt-0.5">
                Batch ingestion with collision resolution and preview validation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-md hover:bg-white/[0.06] text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleImport} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Input File & Inspector */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Source Data File Path
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputPath}
                  onChange={(e) => setInputPath(e.target.value)}
                  placeholder="Path to .json, .ndjson, or .csv"
                  required
                  className="flex-1 px-3 py-1.5 bg-surface border border-hairline rounded-md text-xs font-mono text-white focus:outline-none focus:border-mongo"
                />
                <FilePickerButton
                  accept=".ndjson,.json,.csv"
                  title="Select Source File"
                  onSelect={(path) => setInputPath(path)}
                />
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={isPreviewing}
                  className="px-3 py-1.5 rounded-md bg-surface hover:bg-surface-hover text-xs font-mono text-gray-300 border border-hairline flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <FileSearch className={`w-3.5 h-3.5 ${isPreviewing ? "animate-spin text-mongo" : ""}`} />
                  <span>{isPreviewing ? "Inspecting..." : "Preview (10 rows)"}</span>
                </button>
              </div>
            </div>

            {/* Format and Conflict Options */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Source Format
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as ExportFormat)}
                  className="w-full px-3 py-1.5 bg-surface border border-hairline rounded-md text-xs font-sans text-white focus:outline-none focus:border-mongo cursor-pointer"
                >
                  <option value="ndjson" className="bg-modal text-white">NDJSON (Newline-Delimited)</option>
                  <option value="json" className="bg-modal text-white">JSON Array</option>
                  <option value="csv" className="bg-modal text-white">CSV (Header Line)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Key Collision Resolution
                </label>
                <select
                  value={conflictMode}
                  onChange={(e) => setConflictMode(e.target.value as ConflictMode)}
                  className="w-full px-3 py-1.5 bg-surface border border-hairline rounded-md text-xs font-sans text-white focus:outline-none focus:border-mongo cursor-pointer"
                >
                  <option value="upsert" className="bg-modal text-white">Upsert (Replace matching _id)</option>
                  <option value="skip" className="bg-modal text-white">Skip (Keep existing)</option>
                  <option value="stoponerror" className="bg-modal text-white">Stop On First Error</option>
                </select>
              </div>
            </div>

            {/* Import Flags */}
            <div className="space-y-2 pt-1 text-xs text-gray-300">
              <div>
                <Checkbox
                  checked={dropExisting}
                  onChange={(c) => setDropExisting(c)}
                  label={
                    <span className={dropExisting ? "text-guard font-semibold" : ""}>
                      Drop collection before importing (--drop)
                    </span>
                  }
                />
              </div>
              <div>
                <Checkbox
                  checked={ignoreBlanks}
                  onChange={(c) => setIgnoreBlanks(c)}
                  label="Ignore empty/blank values in CSV/TSV (--ignoreBlanks)"
                />
              </div>
            </div>

            {/* Production Warning */}
            {isProduction && (
              <div className="p-2.5 rounded-lg bg-surface border border-guard/30 text-red-200 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-guard shrink-0" />
                <span>Production Guard: Bulk data insertion into Production will be confirmed.</span>
              </div>
            )}

            {/* Preview Table */}
            {preview && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                  <span>File Header & Sample Records ({preview.total_preview_rows} rows)</span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    Columns: {preview.headers.join(", ")}
                  </span>
                </div>
                <div className="border border-hairline rounded-lg overflow-x-auto max-h-36 bg-surface/50">
                  <table className="w-full text-left text-[11px] font-mono divide-y divide-hairline">
                    <thead className="bg-surface text-gray-400">
                      <tr>
                        {preview.headers.map((h) => (
                          <th key={h} className="p-2 border-r border-hairline">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                      {preview.preview_records.map((rec, i) => (
                        <tr key={i} className="hover:bg-surface/30">
                          {preview.headers.map((h) => (
                            <td key={h} className="p-2 border-r border-hairline truncate max-w-xs text-gray-200">
                              {String(rec[h] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="p-2.5 rounded-lg bg-surface border border-guard/30 text-red-300 text-xs select-text cursor-text break-all">
                {error}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-hairline bg-panel flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isImporting}
              className="px-3.5 py-2 rounded-md hover:bg-white/[0.05] text-xs font-medium text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isImporting}
              className="px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-600 text-xs font-semibold text-gray-950 flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${isImporting ? "animate-spin" : ""}`} />
              <span>{isImporting ? "Importing Data..." : "Run Import"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
