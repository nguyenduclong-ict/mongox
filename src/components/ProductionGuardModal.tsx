import React, { useState } from "react";
import { ShieldAlert, X, AlertTriangle } from "lucide-react";

interface ProductionGuardModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionName: string;
  entityName: string;
  onConfirmed: () => Promise<void>;
}

export const ProductionGuardModal: React.FC<ProductionGuardModalProps> = ({
  isOpen,
  onClose,
  actionName,
  entityName,
  onConfirmed,
}) => {
  const [typedConfirm, setTypedConfirm] = useState<string>("");
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isMatched = typedConfirm.trim() === entityName.trim();

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMatched) return;

    setIsExecuting(true);
    setError(null);
    try {
      await onConfirmed();
      setTypedConfirm("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-modal border border-guard/40 rounded-xl shadow-modal text-gray-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-14 px-6 border-b border-hairline flex items-center justify-between shrink-0 bg-guard/10">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-surface border border-guard/30 text-guard">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Production Guard Confirmation
              </h2>
              <p className="text-[11px] text-red-300">
                Critical safeguard against accidental data destruction
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
        <form onSubmit={handleConfirm} className="p-6 space-y-4">
          <div className="p-3 rounded-lg bg-guard/10 border border-guard/20 text-xs text-red-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-guard shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div>
                You are executing <strong className="text-white">{actionName}</strong> on a cluster tagged as <span className="font-mono text-red-300 uppercase font-semibold">Production</span>.
              </div>
              <div className="text-[11px] text-gray-300">
                This modification is irreversible. To proceed, type the exact target identifier below:
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono text-gray-300">
                Type <strong className="text-white font-bold select-all bg-surface px-1.5 py-0.5 rounded border border-hairline">{entityName}</strong> to unlock:
              </label>
            </div>
            <input
              type="text"
              value={typedConfirm}
              onChange={(e) => setTypedConfirm(e.target.value)}
              placeholder={entityName}
              required
              autoFocus
              className="w-full px-3 py-2 bg-surface border border-guard/40 rounded-md text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-guard transition-colors shadow-inner"
            />
          </div>

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
              disabled={!isMatched || isExecuting}
              className="px-4 py-1.5 rounded-md bg-guard hover:bg-red-600 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{isExecuting ? "Executing..." : "Confirm & Permanently Execute"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
