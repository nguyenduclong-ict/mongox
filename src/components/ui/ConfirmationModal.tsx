import React, { useState, useEffect } from "react";
import { AlertTriangle, X, Trash2, ShieldAlert } from "lucide-react";

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: "danger" | "warning" | "primary";
  entityName?: string;
  isProduction?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
  confirmVariant = "danger",
  entityName,
  isProduction = false,
}) => {
  const [typedConfirm, setTypedConfirm] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    setTypedConfirm("");
    setIsSubmitting(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const requiresTyping = isProduction && Boolean(entityName);
  const isMatch = !requiresTyping || typedConfirm.trim() === entityName?.trim();

  const handleConfirm = async () => {
    if (!isMatch || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const getButtonStyles = () => {
    switch (confirmVariant) {
      case "danger":
        return "bg-guard hover:bg-red-600 text-white font-semibold shadow-sm";
      case "warning":
        return "bg-amber-500 hover:bg-amber-600 text-gray-950 font-semibold shadow-sm";
      default:
        return "bg-mongo hover:bg-emerald-600 text-gray-950 font-semibold shadow-sm";
    }
  };

  const getHeaderIcon = () => {
    if (confirmVariant === "danger") {
      return <Trash2 className="w-4 h-4 text-guard shrink-0" />;
    }
    if (confirmVariant === "warning") {
      return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
    }
    return <AlertTriangle className="w-4 h-4 text-mongo shrink-0" />;
  };

  return (
    <div className="modal-backdrop-elevated">
      <div className="modal-shell max-w-md">
        {/* Header */}
        <div className="modal-header-compact">
          <div className="flex items-center gap-2.5">
            {getHeaderIcon()}
            <h3 className="modal-title">{title}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="btn-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          <p className="text-gray-300 leading-relaxed">{message}</p>

          {requiresTyping && (
            <div className="p-3.5 rounded-lg bg-surface border border-guard/30 space-y-2">
              <div className="flex items-center gap-1.5 text-red-300 font-semibold text-xs">
                <ShieldAlert className="w-4 h-4 text-guard shrink-0" />
                <span>Production confirmation required</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Type <strong className="text-white font-mono">{entityName}</strong> below to confirm:
              </p>
              <input
                type="text"
                value={typedConfirm}
                onChange={(e) => setTypedConfirm(e.target.value)}
                placeholder={entityName}
                autoFocus
                className="form-input focus:border-guard"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="modal-footer-compact">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn-ghost"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isMatch || isSubmitting}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${getButtonStyles()}`}
          >
            {isSubmitting ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
