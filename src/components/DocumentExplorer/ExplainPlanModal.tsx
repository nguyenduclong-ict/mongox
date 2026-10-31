import React, { useState } from "react";
import { ExplainResult } from "../../types";
import {
  Activity,
  X,
  CheckCircle2,
  Clock,
  Eye,
  Key,
  Layers,
  FileCode,
  Info,
  Copy,
  Check,
} from "lucide-react";

interface ExplainPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  explain: ExplainResult | null;
  database: string;
  collection: string;
}

export const ExplainPlanModal: React.FC<ExplainPlanModalProps> = ({
  isOpen,
  onClose,
  explain,
  database,
  collection,
}) => {
  const [showRaw, setShowRaw] = useState<boolean>(false);
  const [copiedRaw, setCopiedRaw] = useState<boolean>(false);

  if (!isOpen || !explain) return null;

  const isCollScan = explain.is_collection_scan || explain.stage === "COLLSCAN";

  const handleCopyRaw = () => {
    if (!explain.raw_stats_json) return;
    navigator.clipboard.writeText(explain.raw_stats_json);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-modal border border-hairline rounded-xl shadow-modal text-gray-200 overflow-hidden flex flex-col max-h-[85vh] font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-hairline flex items-center justify-between shrink-0 bg-modal">
          <div className="flex items-center gap-3 min-w-0">
            <Activity className={`w-4 h-4 shrink-0 ${isCollScan ? "text-amber-400" : "text-mongo"}`} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white tracking-tight">
                  Visual Query Profiler & Explain Plan
                </h2>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold border ${
                    isCollScan
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                      : "bg-mongo/10 border-mongo/30 text-emerald-300"
                  }`}
                >
                  {explain.stage}
                </span>
              </div>
              <p className="text-[12px] text-gray-400 font-normal truncate mt-0.5">
                Analysis for {database}.{collection}
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

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Performance Advisory Banner */}
          {isCollScan ? (
            <div className="p-3.5 rounded-lg bg-surface border border-amber-500/30 text-xs text-amber-200 flex items-start gap-3">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-amber-100">
                  Collection Scan (COLLSCAN)
                </div>
                <div className="text-[11px] text-gray-300 leading-relaxed">
                  No index matched this query. MongoDB examined{" "}
                  <strong className="text-white font-mono">{explain.total_docs_examined} documents</strong> to return{" "}
                  <strong className="text-white font-mono">{explain.n_returned} documents</strong>. Creating an index matching this filter will optimize execution throughput.
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-lg bg-surface border border-mongo/30 text-xs text-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-mongo shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-white">
                  Index Utilized ({explain.stage})
                </div>
                <div className="text-[11px] text-gray-300 leading-relaxed">
                  Query satisfied using index:{" "}
                  <code className="text-emerald-300 font-mono font-semibold">
                    {explain.index_name || "_id_"}
                  </code>
                  . Examined {explain.total_keys_examined} index keys.
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-lg bg-surface border border-hairline space-y-1">
              <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                <Clock className="w-3 h-3 text-mongo" />
                <span>Execution Time</span>
              </div>
              <div className="text-base font-semibold text-white font-mono">
                {explain.execution_time_millis} ms
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface border border-hairline space-y-1">
              <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                <Eye className="w-3 h-3 text-sky-400" />
                <span>Docs Examined</span>
              </div>
              <div className="text-base font-semibold text-white font-mono">
                {explain.total_docs_examined.toLocaleString()}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface border border-hairline space-y-1">
              <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                <Layers className="w-3 h-3 text-emerald-400" />
                <span>Returned</span>
              </div>
              <div className="text-base font-semibold text-white font-mono">
                {explain.n_returned.toLocaleString()}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface border border-hairline space-y-1">
              <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                <Key className="w-3 h-3 text-amber-400" />
                <span>Keys Examined</span>
              </div>
              <div className="text-base font-semibold text-white font-mono">
                {explain.total_keys_examined.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Raw JSON Toggle & Viewer */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowRaw(!showRaw)}
              className="px-3 py-1.5 rounded-md bg-surface border border-hairline hover:bg-surface-hover text-xs font-mono text-gray-300 hover:text-white flex items-center gap-2 transition-colors"
            >
              <FileCode className="w-3.5 h-3.5 text-mongo" />
              <span>{showRaw ? "Hide Raw Execution Plan JSON" : "View Raw Execution Plan JSON"}</span>
            </button>

            {showRaw && (
              <div className="mt-2.5 rounded-lg border border-hairline bg-canvas overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-hairline bg-surface/60 text-[10px] font-mono text-gray-400">
                  <span>Raw Execution Plan JSON</span>
                  <button
                    type="button"
                    onClick={handleCopyRaw}
                    className="flex items-center gap-1 text-gray-300 hover:text-white transition-colors"
                  >
                    {copiedRaw ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 text-[11px] font-mono text-gray-300 max-h-56 overflow-auto leading-relaxed select-all">
                  {explain.raw_stats_json}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-hairline bg-panel flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-surface hover:bg-white/[0.08] text-xs font-medium text-gray-200 border border-hairline transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
