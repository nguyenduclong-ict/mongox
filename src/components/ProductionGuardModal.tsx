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
    <div className="modal-backdrop-elevated">
      <div className="modal-shell max-w-md border-guard/30">
        {/* Header */}
        <div className="modal-header-compact bg-guard/[0.06]">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-guard shrink-0" />
            <div>
              <h2 className="modal-title">
                Production Guard Confirmation
              </h2>
              <p className="text-[11px] text-red-300 font-normal">
                Safeguard against accidental data destruction
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="btn-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleConfirm} className="flex flex-col">
          <div className="p-5 space-y-4">
            <div className="p-3.5 rounded-lg bg-surface border border-guard/20 text-xs text-red-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-guard shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div>
                  You are executing <strong className="text-white">{actionName}</strong> on a cluster tagged as <span className="font-mono text-red-300 uppercase font-semibold">Production</span>.
                </div>
                <div className="text-[11px] text-gray-400">
                  This modification is irreversible. To proceed, type the exact target identifier below:
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-mono text-gray-300">
                  Type <strong className="text-white font-semibold select-all bg-surface px-1.5 py-0.5 rounded border border-hairline">{entityName}</strong> to unlock:
                </label>
              </div>
              <input
                type="text"
                value={typedConfirm}
                onChange={(e) => setTypedConfirm(e.target.value)}
                placeholder={entityName}
                required
                autoFocus
                className="form-input border-guard/40 focus:border-guard"
              />
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-surface border border-guard/30 text-red-300 text-xs">
                {error}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="modal-footer-compact">
            <button
              type="button"
              onClick={onClose}
              disabled={isExecuting}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isMatched || isExecuting}
              className="btn-danger"
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
