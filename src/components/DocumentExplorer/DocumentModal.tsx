import React, { useState, useEffect } from "react";
import { X, CheckCircle, AlertTriangle, Code2, AlignLeft } from "lucide-react";

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (docJson: string, id?: string) => Promise<void>;
  document?: Record<string, unknown> | null;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  document: initialDoc,
}) => {
  const [jsonContent, setJsonContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const isEditing = !!initialDoc;
  const docId = initialDoc ? String(initialDoc["_id"] || "") : undefined;

  useEffect(() => {
    if (initialDoc) {
      setJsonContent(JSON.stringify(initialDoc, null, 2));
    } else {
      setJsonContent(
        JSON.stringify(
          {
            name: "New Document",
            status: "active",
            createdAt: new Date().toISOString(),
          },
          null,
          2
        )
      );
    }
    setError(null);
  }, [initialDoc, isOpen]);

  if (!isOpen) return null;

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonContent);
      setJsonContent(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON syntax");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      JSON.parse(jsonContent);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON syntax");
      return;
    }

    setIsSaving(true);
    try {
      await onSave(jsonContent, docId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-modal border border-white/10 rounded-xl shadow-modal text-gray-200 overflow-hidden flex flex-col h-[78vh] font-sans">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-hairline flex items-center justify-between shrink-0 bg-modal">
          <div className="flex items-center gap-3 min-w-0">
            <Code2 className="w-4 h-4 text-mongo shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white tracking-tight">
                  {isEditing ? "Edit Document" : "Insert New Document"}
                </h2>
                {docId && (
                  <span className="text-[11px] font-mono text-gray-400 truncate max-w-[240px]">
                    ({docId})
                  </span>
                )}
              </div>
              <p className="text-[12px] text-gray-400 font-normal mt-0.5">
                Structured BSON/JSON payload with schema validation
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

        {/* Modal Editor Body */}
        <form onSubmit={handleSave} className="flex-1 flex flex-col p-6 space-y-3 min-h-0">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-300">
              Document Payload (JSON)
            </label>
            <button
              type="button"
              onClick={handleFormat}
              className="text-xs text-mongo hover:underline font-mono flex items-center gap-1.5 transition-colors"
              title="Prettify and format JSON"
            >
              <AlignLeft className="w-3.5 h-3.5" />
              <span>Format JSON</span>
            </button>
          </div>

          <div className="flex-1 min-h-0 relative rounded-lg border border-hairline bg-canvas overflow-hidden">
            <textarea
              value={jsonContent}
              onChange={(e) => {
                setJsonContent(e.target.value);
                setError(null);
              }}
              className="w-full h-full p-3.5 bg-canvas text-xs font-mono text-gray-100 placeholder-gray-600 focus:outline-none resize-none leading-relaxed selection:bg-mongo/30"
              spellCheck={false}
              required
            />
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-2.5 rounded-lg bg-surface border border-guard/30 text-red-300 text-xs flex items-center gap-2 shrink-0 select-text cursor-text">
              <AlertTriangle className="w-4 h-4 text-guard shrink-0" />
              <span className="break-all">{error}</span>
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-3 border-t border-hairline flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3.5 py-2 rounded-md hover:bg-white/[0.05] text-xs font-medium text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-md bg-mongo hover:bg-emerald-600 text-xs font-semibold text-gray-950 flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{isSaving ? "Saving..." : isEditing ? "Update Document" : "Insert Document"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
