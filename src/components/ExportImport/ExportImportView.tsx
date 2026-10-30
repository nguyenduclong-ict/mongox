import React, { useState } from "react";
import { ExportConfig, ImportConfig, JobSummary } from "../../types";
import { ExportModal } from "./ExportModal";
import { ImportModal } from "./ImportModal";
import { runExport, runImport, previewImportFile } from "../../services/tauri";
import {
  Share2,
  Download,
  Upload,
  Shield,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";

interface ExportImportViewProps {
  connectionId: string | null;
  database: string | null;
  collection: string | null;
  isProduction?: boolean;
  onRequireProductionConfirm?: (
    actionName: string,
    entityName: string,
    onConfirmed: () => Promise<void>
  ) => void;
}

export const ExportImportView: React.FC<ExportImportViewProps> = ({
  connectionId,
  database,
  collection,
  isProduction,
  onRequireProductionConfirm,
}) => {
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);
  const [jobs, setJobs] = useState<JobSummary[]>([
    {
      success: true,
      records_processed: 8210,
      bytes_transferred: 1048576,
      elapsed_ms: 320,
      output_path: "customers_masked.csv",
      message: "Exported 8,210 customers with email & phone masking enabled.",
    },
  ]);

  const handleRunExport = async (config: ExportConfig) => {
    const summary = await runExport(config);
    setJobs((prev) => [summary, ...prev]);
  };

  const handleRunImport = async (config: ImportConfig) => {
    const execute = async () => {
      const summary = await runImport(config);
      setJobs((prev) => [summary, ...prev]);
    };

    if (isProduction && onRequireProductionConfirm) {
      onRequireProductionConfirm(
        "Bulk Data Ingestion",
        `${config.database}.${config.collection}`,
        execute
      );
    } else {
      await execute();
    }
  };

  return (
    <div className="flex-1 bg-canvas overflow-y-auto p-6 space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-4 border-b border-hairline">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-surface border border-hairline text-mongo">
              <Share2 className="w-4 h-4" />
            </div>
            <h1 className="text-base font-semibold text-white tracking-tight">
              Export & Import Wizard (mongoexport / mongoimport)
            </h1>
          </div>
          <p className="text-xs text-gray-400">
            Transfer data across CSV, JSON, and NDJSON with automated PII masking and schema alignment
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsImportOpen(true)}
            disabled={!connectionId || !database || !collection}
            className="px-3 py-1.5 rounded-md bg-surface hover:bg-surface-hover text-xs font-medium text-gray-300 border border-hairline flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Import Data</span>
          </button>

          <button
            onClick={() => setIsExportOpen(true)}
            disabled={!connectionId || !database || !collection}
            className="px-3 py-1.5 rounded-md bg-mongo hover:bg-emerald-600 text-xs font-semibold text-gray-950 flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* Feature Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-panel border border-hairline space-y-2">
          <div className="flex items-center gap-2 text-mongo text-xs font-semibold">
            <Shield className="w-4 h-4" />
            <span>Smart Data Masking (PII Protection)</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Protect sensitive customer data during exports. Mask emails (<code className="text-gray-300 font-mono">j***@domain.com</code>), obfuscate phone numbers, or compute SHA-256 hashes in-memory before saving files.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-panel border border-hairline space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Multi-Format Ingestion with Auto-Mapping</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Ingest external datasets from JSON arrays, newline-delimited NDJSON, or CSV files. Preview the initial 10 records and choose key collision strategies (<code className="text-gray-300 font-mono">upsert</code> or <code className="text-gray-300 font-mono">skip</code>).
          </p>
        </div>
      </div>

      {/* Execution Jobs History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-gray-400" />
            <h2 className="text-xs font-semibold text-gray-200 uppercase tracking-wider">
              Data Transfer Activity Log
            </h2>
          </div>
          <span className="text-[11px] font-mono text-gray-500">
            {jobs.length} operations logged
          </span>
        </div>

        <div className="bg-panel border border-hairline rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-surface/50 border-b border-hairline text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                <th className="py-2 px-4">Status</th>
                <th className="py-2 px-4">File Path</th>
                <th className="py-2 px-4">Records</th>
                <th className="py-2 px-4">Size</th>
                <th className="py-2 px-4">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline font-mono text-[11px]">
              {jobs.map((job, idx) => (
                <tr key={idx} className="hover:bg-surface/30 transition-colors">
                  <td className="py-2.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        job.success
                          ? "bg-mongo/10 border-mongo/30 text-mongo"
                          : "bg-guard/10 border-guard/30 text-guard"
                      }`}
                    >
                      {job.success ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                      <span>{job.success ? "COMPLETED" : "FAILED"}</span>
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-gray-200 max-w-xs truncate">
                    {job.output_path || "Data Stream"}
                  </td>
                  <td className="py-2.5 px-4 text-gray-300">
                    {job.records_processed.toLocaleString()} records
                  </td>
                  <td className="py-2.5 px-4 text-gray-400">
                    {(job.bytes_transferred / 1024).toFixed(1)} KB
                  </td>
                  <td className="py-2.5 px-4 text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-500" />
                    <span>{job.elapsed_ms} ms</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onRunExport={handleRunExport}
        connectionId={connectionId || ""}
        database={database || "store_db"}
        collection={collection || "customers"}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onRunImport={handleRunImport}
        onPreviewFile={previewImportFile}
        connectionId={connectionId || ""}
        database={database || "store_db"}
        collection={collection || "customers"}
        isProduction={isProduction}
      />
    </div>
  );
};
