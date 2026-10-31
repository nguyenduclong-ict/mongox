import React from "react";
import { DownloadProgress } from "../types";
import { Download, CheckCircle2, AlertTriangle, ShieldCheck, Cpu } from "lucide-react";

interface ProvisioningModalProps {
  progress: DownloadProgress | null;
  isOpen: boolean;
}

export const ProvisioningModal: React.FC<ProvisioningModalProps> = ({ progress, isOpen }) => {
  if (!isOpen || !progress) return null;

  const isFailed = progress.stage === "failed";
  const isReady = progress.stage === "ready";
  const isVerifying = progress.stage === "verifying";

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 MB";
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatSpeed = (bytesPerSec: number) => {
    if (bytesPerSec === 0) return "-- KB/s";
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const getStatusIcon = () => {
    if (isReady) return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
    if (isFailed) return <AlertTriangle className="w-5 h-5 text-guard shrink-0" />;
    if (isVerifying) return <ShieldCheck className="w-5 h-5 text-mongo shrink-0" />;
    return <Download className="w-5 h-5 text-mongo shrink-0 animate-pulse" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-modal border border-hairline rounded-xl shadow-modal p-6 text-gray-200 flex flex-col font-sans">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="mt-0.5">{getStatusIcon()}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white tracking-tight">
                {isReady
                  ? "Engine Component Ready"
                  : isFailed
                  ? "Provisioning Interrupted"
                  : "On-Demand Engine Provisioning"}
              </h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-hairline text-gray-400 font-mono uppercase">
                {progress.bundle}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Official MongoDB CLI Tooling Integration
            </p>
          </div>
        </div>

        {/* Message description */}
        <div className="bg-modal-recessed border border-hairline rounded-lg p-3 mb-4 text-xs font-mono text-gray-300 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="truncate">{progress.message}</span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 mb-4">
          <div className="flex justify-between text-xs text-gray-400 font-mono">
            <span>
              {formatBytes(progress.downloaded_bytes)} of {formatBytes(progress.total_bytes)}
            </span>
            <span className="text-white font-semibold">
              {progress.progress_percent.toFixed(0)}%
            </span>
          </div>

          <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden border border-hairline/60">
            <div
              className={`h-full transition-all duration-200 rounded-full ${
                isFailed ? "bg-guard" : "bg-mongo"
              }`}
              style={{ width: `${Math.min(100, Math.max(0, progress.progress_percent))}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[11px] font-mono text-gray-500 pt-1">
            <span>Speed: {formatSpeed(progress.speed_bytes_per_sec)}</span>
            <span className="capitalize">{progress.stage}</span>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-[11px] text-gray-400 border-t border-hairline/60 pt-3 flex items-center justify-between font-mono">
          <span>Verified with SHA-256 Checksum</span>
          <span className="text-mongo flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-mongo inline-block" />
            Active
          </span>
        </div>
      </div>
    </div>
  );
};
