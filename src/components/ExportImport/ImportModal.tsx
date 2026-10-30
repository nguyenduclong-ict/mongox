import React, { useState } from "react";
import { ConflictMode, ExportFormat, ImportConfig, ImportPreview } from "../../types";
import { Upload, X, Play, FileSearch, ShieldAlert } from "lucide-react";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunImport: (config: ImportConfig) => Promise<void>;
  onPreviewFile: (path: string, format: string) => Promise<ImportPreview>;
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
  connectionId,
  database,
  collection,
  isProduction,
}) => {
  const [inputPath, setInputPath] = useState<string>("data_feed.ndjson");
  const [format, setFormat] = useState<ExportFormat>("ndjson");
  const [conflictMode, setConflictMode] = useState<ConflictMode>("upsert");

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
      await onRunImport({
        connection_id: connectionId,
        database,
        collection,
        format,
        input_path: inputPath.trim(),
        conflict_mode: conflictMode,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-modal border border-white/10 rounded-xl shadow-modal text-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="h-14 px-6 border-b border-hairline flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-surface border border-hairline text-emerald-400">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Import Data into {database}.{collection}
              </h2>
              <p className="text-[11px] text-gray-400">
                CSV, JSON, and NDJSON ingestion with preview and collision resolution
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
        <form onSubmit={handleImport} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* File path & preview */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Source File Path
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
                className="w-full px-3 py-1.5 bg-surface border border-hairline rounded-md text-xs font-sans text-white focus:outline-none focus:border-mongo"
              >
                <option value="ndjson">NDJSON (Newline-Delimited)</option>
                <option value="json">JSON Array</option>
                <option value="csv">CSV (Header Line)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Key Collision Resolution
              </label>
              <select
                value={conflictMode}
                onChange={(e) => setConflictMode(e.target.value as ConflictMode)}
                className="w-full px-3 py-1.5 bg-surface border border-hairline rounded-md text-xs font-sans text-white focus:outline-none focus:border-mongo"
              >
                <option value="upsert">Upsert (Replace matching _id)</option>
                <option value="skip">Skip (Keep existing)</option>
                <option value="stoponerror">Stop On First Error</option>
              </select>
            </div>
          </div>

          {/* Production Warning */}
          {isProduction && (
            <div className="p-2.5 rounded bg-guard/10 border border-guard/30 text-red-200 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-guard shrink-0" />
              <span>Production Guard: Bulk data insertion into Production will be confirmed.</span>
            </div>
          )}

          {/* Preview Table */}
          {preview && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                <span>File Header & Sample Records ({preview.total_preview_rows} rows)</span>
                <span className="text-[10px] text-gray-500 font-mono">
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
            <div className="p-2.5 rounded bg-guard/10 border border-guard/30 text-red-300 text-xs">
              {error}
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
              disabled={isImporting}
              className="px-4 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-600 text-xs font-semibold text-gray-950 flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
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
