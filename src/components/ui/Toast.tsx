import React, { useEffect } from "react";
import { CheckCircle2, AlertTriangle, Info, Loader2, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  type: "info" | "success" | "loading" | "error";
  message: string;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    if (toast.type !== "loading") {
      const timer = setTimeout(() => {
        onDismiss(toast.id);
      }, toast.duration || 3000);
      return () => clearTimeout(timer);
    }
  }, [toast, onDismiss]);

  const getIcon = () => {
    switch (toast.type) {
      case "loading":
        return <Loader2 className="w-3.5 h-3.5 text-mongo animate-spin shrink-0" />;
      case "success":
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case "error":
        return <AlertTriangle className="w-3.5 h-3.5 text-guard shrink-0" />;
      default:
        return <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case "error":
        return "border-guard/40 bg-modal text-red-200";
      case "success":
        return "border-mongo/40 bg-modal text-emerald-200";
      default:
        return "border-white/10 bg-modal text-gray-200";
    }
  };

  return (
    <div
      className={`pointer-events-auto border rounded-lg shadow-modal px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs font-mono transition-all animate-in fade-in slide-in-from-bottom-2 duration-150 select-text cursor-default ${getBorderColor()}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {getIcon()}
        <span className="truncate">{toast.message}</span>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-0.5 rounded hover:bg-surface text-gray-400 hover:text-white transition-colors shrink-0"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};
