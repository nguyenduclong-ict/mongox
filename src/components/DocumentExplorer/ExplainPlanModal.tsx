import React from "react";
import { ExplainResult } from "../../types";
import {
  Activity,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Key,
  Layers,
  FileCode,
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
  const [showRaw, setShowRaw] = React.useState<boolean>(false);

  if (!isOpen || !explain) return null;

  const isCollScan = explain.is_collection_scan || explain.stage === "COLLSCAN";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-modal border border-white/10 rounded-xl shadow-modal text-gray-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="h-14 px-6 border-b border-hairline flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-1.5 rounded-lg border ${
                isCollScan
                  ? "bg-guard/10 border-guard/30 text-guard"
                  : "bg-mongo/10 border-mongo/30 text-mongo"
              }`}
            >
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white tracking-tight">
                  Visual Query Profiler & Explain Plan
                </h2>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                    isCollScan
                      ? "bg-guard/20 border-guard/40 text-red-300 animate-pulse"
                      : "bg-mongo/20 border-mongo/40 text-emerald-300"
                  }`}
                >
                  {explain.stage}
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                Execution plan analysis for {database}.{collection}
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

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Performance Alert Banner */}
          {isCollScan ? (
            <div className="p-3.5 rounded-xl bg-guard/10 border border-guard/30 text-xs text-red-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-guard shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-white">
                  Warning: Unindexed Full Collection Scan (COLLSCAN)
                </div>
                <div className="text-[11px] text-gray-300 leading-relaxed">
                  MongoDB examined <strong className="text-white">{explain.total_docs_examined} documents</strong> to return <strong className="text-white">{explain.n_returned} documents</strong>. Creating an index matching this filter will drastically improve query throughput.
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-mongo/10 border border-mongo/30 text-xs text-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-mongo shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-white">
                  Optimal Index Utilization ({explain.stage})
                </div>
                <div className="text-[11px] text-gray-300 leading-relaxed">
                  Query satisfied using index:{" "}
                  <code className="text-emerald-300 font-mono font-semibold">
                    {explain.index_name || "_id_"}
                  </code>
                  . Only examined {explain.total_keys_examined} index keys.
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-surface/50 border border-hairline space-y-1">
              <div className="text-[10px] text-gray-500 font-mono uppercase flex items-center gap-1">
                <Clock className="w-3 h-3 text-mongo" />
                <span>Execution Time</span>
              </div>
              <div className="text-base font-semibold text-white font-mono">
                {explain.execution_time_millis} ms
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface/50 border border-hairline space-y-1">
              <div className="text-[10px] text-gray-500 font-mono uppercase flex items-center gap-1">
                <Eye className="w-3 h-3 text-sky-400" />
                <span>Docs Examined</span>
              </div>
              <div className="text-base font-semibold text-white font-mono">
                {explain.total_docs_examined.toLocaleString()}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface/50 border border-hairline space-y-1">
              <div className="text-[10px] text-gray-500 font-mono uppercase flex items-center gap-1">
                <Layers className="w-3 h-3 text-emerald-400" />
                <span>Returned</span>
              </div>
              <div className="text-base font-semibold text-white font-mono">
                {explain.n_returned.toLocaleString()}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface/50 border border-hairline space-y-1">
              <div className="text-[10px] text-gray-500 font-mono uppercase flex items-center gap-1">
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
              className="text-xs font-mono text-mongo hover:text-emerald-400 flex items-center gap-1.5 transition-colors"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>{showRaw ? "Hide Raw Execution Plan JSON" : "View Raw Execution Plan JSON"}</span>
            </button>

            {showRaw && (
              <pre className="mt-2 p-3 bg-canvas border border-hairline rounded-lg text-[11px] font-mono text-gray-300 max-h-56 overflow-auto leading-relaxed select-all">
                {explain.raw_stats_json}
              </pre>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 px-6 border-t border-hairline flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-surface hover:bg-surface-hover text-xs font-medium text-gray-200 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
