import React, { useState } from "react";
import { ExportConfig, ExportFormat, MaskingRule, MaskingRuleType } from "../../types";
import { Download, X, Play, Shield, FileSpreadsheet, FileJson, FileText, Plus, Trash2 } from "lucide-react";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunExport: (config: ExportConfig) => Promise<void>;
  connectionId: string;
  database: string;
  collection: string;
  availableFields?: string[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onRunExport,
  connectionId,
  database,
  collection,
  availableFields = ["_id", "customer", "email", "phone", "total", "status", "createdAt"],
}) => {
  const [format, setFormat] = useState<ExportFormat>("json");
  const [selectedFields, setSelectedFields] = useState<string[]>(availableFields);
  const [outputPath, setOutputPath] = useState<string>(
    `export_${database}_${collection}.${format === "json" ? "json" : format === "csv" ? "csv" : "ndjson"}`
  );
  const [filter, setFilter] = useState<string>("");

  // Masking Rules
  const [maskingRules, setMaskingRules] = useState<MaskingRule[]>([
    { field_name: "email", rule_type: "email" },
    { field_name: "phone", rule_type: "phone" },
  ]);

  const [newRuleField, setNewRuleField] = useState<string>("");
  const [newRuleType, setNewRuleType] = useState<MaskingRuleType>("redact");

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFormatChange = (fmt: ExportFormat) => {
    setFormat(fmt);
    const ext = fmt === "json" ? "json" : fmt === "csv" ? "csv" : "ndjson";
    setOutputPath(`export_${database}_${collection}.${ext}`);
  };

  const toggleField = (f: string) => {
    setSelectedFields((prev) =>
      prev.includes(f) ? prev.filter((item) => item !== f) : [...prev, f]
    );
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
    setIsExporting(true);
    setError(null);
    try {
      await onRunExport({
        connection_id: connectionId,
        database,
        collection,
        format,
        fields: selectedFields,
        filter: filter.trim() ? filter.trim() : undefined,
        masking_rules: maskingRules,
        output_path: outputPath.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-modal border border-white/10 rounded-xl shadow-modal text-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="h-14 px-6 border-b border-hairline flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-surface border border-hairline text-mongo">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Export Collection Data ({database}.{collection})
              </h2>
              <p className="text-[11px] text-gray-400">
                Format options with built-in Smart Data Masking (PII Protection)
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

        {/* Form Body */}
        <form onSubmit={handleExport} className="p-6 space-y-4 overflow-y-auto flex-1">
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
                  <div className="text-[10px] text-gray-500">Structured</div>
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
                  <div className="text-[10px] text-gray-500">Comma-separated</div>
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
                  <div className="text-[10px] text-gray-500">Line-delimited</div>
                </div>
              </button>
            </div>
          </div>

          {/* Destination Path */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Destination File Path
            </label>
            <input
              type="text"
              value={outputPath}
              onChange={(e) => setOutputPath(e.target.value)}
              required
              className="w-full px-3 py-1.5 bg-surface border border-hairline rounded-md text-xs font-mono text-white focus:outline-none focus:border-mongo"
            />
          </div>

          {/* Fields Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-gray-300">
                Included Fields ({selectedFields.length}/{availableFields.length})
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5 p-2 bg-surface/50 border border-hairline rounded-md max-h-24 overflow-y-auto">
              {availableFields.map((f) => {
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
              <div className="text-[11px] text-gray-500 italic">No masking rules configured.</div>
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
            <div className="p-2.5 rounded bg-guard/10 border border-guard/30 text-red-300 text-xs">
              {error}
            </div>
          )}

          {/* Actions */}
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
              disabled={isExporting}
              className="px-4 py-1.5 rounded-md bg-mongo hover:bg-emerald-600 text-xs font-semibold text-gray-950 flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
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
