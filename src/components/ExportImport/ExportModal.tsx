import React, { useState, useEffect } from "react";
import { ExportConfig, ExportFormat, MaskingRule, MaskingRuleType } from "../../types";
import { Download, X, Play, Shield, FileSpreadsheet, FileJson, FileText, Plus, Trash2, Folder } from "lucide-react";
import { FilePickerButton } from "../ui/FilePickerButton";
import { executeQuery } from "../../services/tauri";

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
  variables: { database?: string; collection?: string },
  extension: string
): string {
  const now = new Date();
  let name = pattern
    .replace(/\{database\}/gi, variables.database || "")
    .replace(/\{collection\}/gi, variables.collection || "")
    .replace(/\{datetime\}/gi, formatToken(now, "{datetime}"))
    .replace(/\{date\}/gi, formatToken(now, "{date}"))
    .replace(/\{time\}/gi, formatToken(now, "{time}"))
    .replace(/\{timestamp\}/gi, formatToken(now, "{timestamp}"));

  if (!name.trim()) {
    name = `${variables.database || "export"}_${variables.collection || "data"}_${formatToken(now, "{datetime}")}`;
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

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunExport: (config: ExportConfig) => Promise<void>;
  onEnsureTool?: (tool: string) => Promise<string>;
  connectionId: string;
  database: string;
  collection: string;
  availableFields?: string[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onRunExport,
  onEnsureTool,
  connectionId,
  database,
  collection,
  availableFields: initialAvailableFields,
}) => {
  const [format, setFormat] = useState<ExportFormat>("json");
  const [fields, setFields] = useState<string[]>(initialAvailableFields || ["_id"]);
  const [selectedFields, setSelectedFields] = useState<string[]>(initialAvailableFields || ["_id"]);
  const [isLoadingFields, setIsLoadingFields] = useState<boolean>(false);
  const [customFieldInput, setCustomFieldInput] = useState<string>("");
  const [outputDir, setOutputDir] = useState<string>("./exports");
  const [fileNamePattern, setFileNamePattern] = useState<string>(
    "{database}_{collection}_{datetime}"
  );
  const [filter, setFilter] = useState<string>("");

  // Masking Rules
  const [maskingRules, setMaskingRules] = useState<MaskingRule[]>([]);
  const [newRuleField, setNewRuleField] = useState<string>("");
  const [newRuleType, setNewRuleType] = useState<MaskingRuleType>("redact");

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !connectionId || !database || !collection) return;
    let active = true;
    setIsLoadingFields(true);

    executeQuery({
      connection_id: connectionId,
      database,
      collection,
      filter: "{}",
      limit: 50,
      skip: 0,
    })
      .then((result) => {
        if (!active) return;
        const keySet = new Set<string>();
        keySet.add("_id");
        if (result && Array.isArray(result.documents) && result.documents.length > 0) {
          for (const doc of result.documents) {
            if (doc && typeof doc === "object") {
              Object.keys(doc).forEach((k) => keySet.add(k));
            }
          }
        }
        const discovered = Array.from(keySet);
        setFields(discovered);
        setSelectedFields(discovered);
      })
      .catch((err) => {
        console.warn("Could not sample collection fields:", err);
        if (initialAvailableFields && initialAvailableFields.length > 0) {
          setFields(initialAvailableFields);
          setSelectedFields(initialAvailableFields);
        } else {
          setFields(["_id"]);
          setSelectedFields(["_id"]);
        }
      })
      .finally(() => {
        if (active) setIsLoadingFields(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, connectionId, database, collection, initialAvailableFields]);

  if (!isOpen) return null;

  const currentExt = format === "json" ? ".json" : format === "csv" ? ".csv" : ".ndjson";
  const previewResolvedPath = buildResolvedPath(outputDir, fileNamePattern, { database, collection }, currentExt);

  const handleFormatChange = (fmt: ExportFormat) => {
    setFormat(fmt);
  };

  const insertToken = (token: string) => {
    setFileNamePattern((prev) => `${prev}_${token}`);
  };

  const toggleField = (f: string) => {
    setSelectedFields((prev) =>
      prev.includes(f) ? prev.filter((item) => item !== f) : [...prev, f]
    );
  };

  const handleAddCustomField = () => {
    const trimmed = customFieldInput.trim();
    if (!trimmed) return;
    if (!fields.includes(trimmed)) {
      setFields((prev) => [...prev, trimmed]);
    }
    if (!selectedFields.includes(trimmed)) {
      setSelectedFields((prev) => [...prev, trimmed]);
    }
    setCustomFieldInput("");
  };

  const addMaskingRule = () => {
    if (!newRuleField.trim()) return;
    if (maskingRules.some((r) => r.field_name === newRuleField.trim())) return;
    setMaskingRules((prev) => [
      ...prev,
      { field_name: newRuleField.trim(), rule_type: newRuleType },
    ]);
    setNewRuleField("");
  };

  const removeMaskingRule = (idx: number) => {
    setMaskingRules((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (format === "csv" && selectedFields.length === 0) {
      setError("CSV export requires at least one field to be selected.");
      return;
    }

    setIsExporting(true);
    setError(null);
    try {
      if (onEnsureTool) {
        await onEnsureTool("mongoexport");
      }

      // If in JSON / NDJSON mode and ALL discovered fields are selected, pass empty fields so mongoexport exports all fields from all documents dynamically
      const effectiveFields =
        format === "csv"
          ? selectedFields
          : selectedFields.length === fields.length
          ? []
          : selectedFields;

      await onRunExport({
        connection_id: connectionId,
        database,
        collection,
        format,
        fields: effectiveFields,
        filter: filter.trim() ? filter.trim() : undefined,
        masking_rules: maskingRules,
        output_path: previewResolvedPath,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-modal border border-hairline rounded-xl shadow-modal text-gray-200 overflow-hidden flex flex-col font-sans max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-hairline flex items-center justify-between shrink-0 bg-modal">
          <div className="flex items-center gap-3 min-w-0">
            <Download className="w-4 h-4 text-mongo shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white tracking-tight">
                  Export Collection Data ({database}.{collection})
                </h2>
                <span className="text-[10px] font-mono font-medium text-gray-400 bg-surface px-1.5 py-0.5 rounded border border-hairline">
                  mongoexport
                </span>
              </div>
              <p className="text-[12px] text-gray-400 font-normal mt-0.5">
                Structured export with selective schema projection and masking
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

        {/* Form Body */}
        <form onSubmit={handleExport} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Format Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Target Data Format
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleFormatChange("json")}
                  className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-colors ${
                    format === "json"
                      ? "bg-surface border-mongo text-white"
                      : "bg-surface/50 border-hairline text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <FileJson className="w-4 h-4 text-mongo" />
                  <div>
                    <div className="text-xs font-semibold">JSON Array</div>
                    <div className="text-[10px] text-gray-500 font-mono">Structured</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleFormatChange("csv")}
                  className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-colors ${
                    format === "csv"
                      ? "bg-surface border-mongo text-white"
                      : "bg-surface/50 border-hairline text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="text-xs font-semibold">CSV</div>
                    <div className="text-[10px] text-gray-500 font-mono">Delimited</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleFormatChange("ndjson")}
                  className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-colors ${
                    format === "ndjson"
                      ? "bg-surface border-mongo text-white"
                      : "bg-surface/50 border-hairline text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <FileText className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="text-xs font-semibold">NDJSON</div>
                    <div className="text-[10px] text-gray-500 font-mono">Line-stream</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Output Directory & Dynamic Filename Pattern */}
            <div className="space-y-3 p-3.5 bg-surface/30 border border-hairline rounded-xl">
              {/* Output Directory */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Output Directory
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <Folder className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={outputDir}
                      onChange={(e) => setOutputDir(e.target.value)}
                      required
                      placeholder="./exports"
                      className="w-full pl-8 pr-3 py-1.5 bg-surface border border-hairline rounded-md text-xs font-mono text-white focus:outline-none focus:border-mongo"
                    />
                  </div>
                  <FilePickerButton
                    directory
                    title="Select Output Folder"
                    onSelect={(folder) => setOutputDir(folder)}
                  />
                </div>
              </div>

              {/* Filename Template Pattern */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-300">
                    File Name Pattern
                  </label>
                  <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono">
                    <span>Tokens:</span>
                    {["{database}", "{collection}", "{datetime}", "{date}", "{time}"].map((token) => (
                      <button
                        key={token}
                        type="button"
                        onClick={() => insertToken(token)}
                        className="px-1 py-0.2 rounded bg-surface hover:bg-surface-hover border border-hairline text-gray-300 hover:text-white"
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
                    placeholder="{database}_{collection}_{datetime}"
                    className="flex-1 px-3 py-1.5 bg-surface border border-hairline rounded-md text-xs font-mono text-white focus:outline-none focus:border-mongo"
                  />
                  <span className="text-xs font-mono text-mongo px-2 py-1.5 rounded bg-surface border border-hairline">
                    {currentExt}
                  </span>
                </div>
              </div>

              {/* Live Path Preview */}
              <div className="pt-1 border-t border-hairline/40">
                <div className="text-[10px] text-gray-500 font-mono mb-0.5">Computed Destination Path:</div>
                <div className="text-[11px] font-mono text-emerald-300 break-all select-all bg-canvas/60 px-2 py-1 rounded border border-hairline/60">
                  {previewResolvedPath}
                </div>
              </div>
            </div>

            {/* Fields Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-300 flex items-center gap-2">
                  <span>Included Fields ({selectedFields.length}/{fields.length})</span>
                  {isLoadingFields && (
                    <span className="text-[10px] text-mongo font-normal animate-pulse">
                      Detecting schema fields...
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-2 text-[11px] font-mono">
                  <button
                    type="button"
                    onClick={() => setSelectedFields([...fields])}
                    className="text-mongo hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-gray-600">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFields([])}
                    className="text-gray-400 hover:text-white hover:underline"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 p-2 bg-surface/50 border border-hairline rounded-md max-h-24 overflow-y-auto">
                {fields.map((f) => {
                  const isSelected = selectedFields.includes(f);
                  return (
                    <button
                      type="button"
                      key={f}
                      onClick={() => toggleField(f)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                        isSelected
                          ? "bg-mongo/10 border-mongo/30 text-mongo font-medium"
                          : "bg-surface border-hairline text-gray-500 hover:text-gray-400"
                      }`}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>

              {/* Custom Field Add */}
              <div className="flex items-center gap-1.5 mt-2">
                <input
                  type="text"
                  value={customFieldInput}
                  onChange={(e) => setCustomFieldInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomField();
                    }
                  }}
                  placeholder="Add field name manually (e.g. metadata.tags)"
                  className="flex-1 px-2.5 py-1 bg-surface border border-hairline rounded text-[11px] font-mono text-white placeholder-gray-600 focus:outline-none focus:border-mongo"
                />
                <button
                  type="button"
                  onClick={handleAddCustomField}
                  className="px-2.5 py-1 rounded bg-surface hover:bg-surface-hover text-gray-300 border border-hairline text-[11px] font-mono flex items-center gap-1"
                  title="Add field"
                >
                  <Plus className="w-3 h-3 text-mongo" />
                  <span>Add Field</span>
                </button>
              </div>
            </div>

            {/* Smart Data Masking (PII Protection) Section */}
            <div className="p-3 bg-surface/40 border border-hairline rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-200">
                  <Shield className="w-3.5 h-3.5 text-mongo" />
                  <span>Smart Data Masking Rules</span>
                </div>
                <span className="text-[10px] text-gray-500 font-mono">
                  Applied in-memory prior to disk write
                </span>
              </div>

              {/* Configured rules tags */}
              {maskingRules.length > 0 ? (
                <div className="space-y-1.5">
                  {maskingRules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-2.5 py-1 rounded bg-panel border border-hairline text-xs font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-gray-300 font-semibold">{rule.field_name}</span>
                        <span className="text-gray-600">→</span>
                        <span className="text-mongo capitalize">{rule.rule_type}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMaskingRule(idx)}
                        className="text-gray-500 hover:text-guard"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-gray-500 italic font-mono">No masking rules configured.</div>
              )}

              {/* Add rule input */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newRuleField}
                  onChange={(e) => setNewRuleField(e.target.value)}
                  placeholder="Field name (e.g. ssn, token)"
                  className="flex-1 px-2.5 py-1 bg-surface border border-hairline rounded text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-mongo"
                />
                <select
                  value={newRuleType}
                  onChange={(e) => setNewRuleType(e.target.value as MaskingRuleType)}
                  className="px-2 py-1 bg-surface border border-hairline rounded text-xs font-mono text-white focus:outline-none"
                >
                  <option value="email">Email Mask</option>
                  <option value="phone">Phone Mask</option>
                  <option value="hashsha256">SHA-256 Hash</option>
                  <option value="redact">Redact</option>
                </select>
                <button
                  type="button"
                  onClick={addMaskingRule}
                  className="p-1.5 rounded bg-surface hover:bg-surface-hover text-gray-300 border border-hairline"
                  title="Add Rule"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Optional Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Query Filter (Optional)
              </label>
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder='{ "status": "active" }'
                className="w-full px-3 py-1.5 bg-surface border border-hairline rounded-md text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-mongo"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-2.5 rounded bg-guard/10 border border-guard/30 text-red-300 text-xs select-text cursor-text break-all">
                {error}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-hairline bg-panel flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="px-3.5 py-2 rounded-md hover:bg-white/[0.05] text-xs font-medium text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isExporting}
              className="px-4 py-2 rounded-md bg-mongo hover:bg-emerald-600 text-xs font-semibold text-gray-950 flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${isExporting ? "animate-spin" : ""}`} />
              <span>{isExporting ? "Exporting..." : "Start Export"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
