import React, { useState } from "react";
import { BackupConfig, JobSummary, RestoreConfig } from "../../types";
import { BackupModal } from "./BackupModal";
import { RestoreModal } from "./RestoreModal";
import { runBackup, runRestore, inspectArchive } from "../../services/tauri";
import {
  HardDriveDownload,
  FolderArchive,
  Plus,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HardDrive,
  FileCheck,
} from "lucide-react";

interface BackupRestoreViewProps {
  connectionId: string | null;
  database: string | null;
  availableCollections: string[];
  isProduction?: boolean;
  onRequireProductionConfirm?: (
    actionName: string,
    entityName: string,
    onConfirmed: () => Promise<void>
  ) => void;
}

export const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({
  connectionId,
  database,
  availableCollections,
  isProduction,
  onRequireProductionConfirm,
}) => {
  const [isBackupOpen, setIsBackupOpen] = useState<boolean>(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState<boolean>(false);
  const [jobs, setJobs] = useState<JobSummary[]>([
    {
      success: true,
      records_processed: 15420,
      bytes_transferred: 8388608,
      elapsed_ms: 850,
      output_path: "backup_store_db_initial.dump.gz",
      message: "Initial cluster snapshot archive verified and stored.",
    },
  ]);

  const handleRunBackup = async (config: BackupConfig) => {
    const summary = await runBackup(config);
    setJobs((prev) => [summary, ...prev]);
  };

  const handleRunRestore = async (config: RestoreConfig) => {
    const execute = async () => {
      const summary = await runRestore(config);
      setJobs((prev) => [summary, ...prev]);
    };

    if (config.drop_existing && isProduction && onRequireProductionConfirm) {
      onRequireProductionConfirm(
        "Drop & Restore Database",
        config.database,
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
              <HardDriveDownload className="w-4 h-4" />
            </div>
            <h1 className="text-base font-semibold text-white tracking-tight">
              Backup & Recovery Hub (mongodump / mongorestore)
            </h1>
          </div>
          <p className="text-xs text-gray-400">
            Create compressed database dump archives and restore data with namespace filtering
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRestoreOpen(true)}
            disabled={!connectionId}
            className="px-3 py-1.5 rounded-md bg-surface hover:bg-surface-hover text-xs font-medium text-gray-300 border border-hairline flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
            <span>Restore Archive</span>
          </button>

          <button
            onClick={() => setIsBackupOpen(true)}
            disabled={!connectionId}
            className="px-3 py-1.5 rounded-md bg-mongo hover:bg-emerald-600 text-xs font-semibold text-gray-950 flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Backup</span>
          </button>
        </div>
      </div>

      {/* Feature Cards Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-panel border border-hairline space-y-2">
          <div className="flex items-center gap-2 text-mongo text-xs font-semibold">
            <HardDrive className="w-4 h-4" />
            <span>Atomic Compressed Archives</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Backups are packaged using <code className="text-gray-300 font-mono">--archive</code> with streaming Gzip compression, producing portable standalone snapshots ready for disaster recovery.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-panel border border-hairline space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
            <FileCheck className="w-4 h-4" />
            <span>Header Inspection & Namespace Isolation</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Inspect archive contents before extraction. Restore specific collections or entire databases safely without manual terminal scripting.
          </p>
        </div>
      </div>

      {/* Job History Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderArchive className="w-4 h-4 text-gray-400" />
            <h2 className="text-xs font-semibold text-gray-200 uppercase tracking-wider">
              Recent Backup & Restore Operations
            </h2>
          </div>
          <span className="text-[11px] font-mono text-gray-500">
            {jobs.length} jobs recorded
          </span>
        </div>

        <div className="bg-panel border border-hairline rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-surface/50 border-b border-hairline text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                <th className="py-2 px-4">Status</th>
                <th className="py-2 px-4">Target / Path</th>
                <th className="py-2 px-4">Records</th>
                <th className="py-2 px-4">Archive Size</th>
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
                      <span>{job.success ? "SUCCESS" : "FAILED"}</span>
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-gray-200 max-w-xs truncate">
                    {job.output_path || "In-Memory Snapshot"}
                  </td>
                  <td className="py-2.5 px-4 text-gray-300">
                    {job.records_processed.toLocaleString()} docs
                  </td>
                  <td className="py-2.5 px-4 text-gray-400">
                    {(job.bytes_transferred / (1024 * 1024)).toFixed(2)} MB
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
      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        onRunBackup={handleRunBackup}
        connectionId={connectionId || ""}
        defaultDb={database || "store_db"}
        availableCollections={availableCollections}
      />

      <RestoreModal
        isOpen={isRestoreOpen}
        onClose={() => setIsRestoreOpen(false)}
        onRunRestore={handleRunRestore}
        onInspectArchive={inspectArchive}
        connectionId={connectionId || ""}
        defaultDb={database || "store_db"}
        isProduction={isProduction}
      />
    </div>
  );
};
