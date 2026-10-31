import React, { useState } from "react";
import { Database, X, AlertTriangle, Plus } from "lucide-react";

interface CreateDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectionName: string;
  onCreate: (dbName: string, colName: string) => Promise<void>;
}

export const CreateDatabaseModal: React.FC<CreateDatabaseModalProps> = ({
  isOpen,
  onClose,
  connectionName,
  onCreate,
}) => {
  const [databaseName, setDatabaseName] = useState<string>("");
  const [collectionName, setCollectionName] = useState<string>("collection_1");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDb = databaseName.trim();
    const cleanCol = collectionName.trim();

    if (!cleanDb || !cleanCol) {
      setError("Database name and initial collection name are required.");
      return;
    }

    if (/[/\\. "$*<>:|?]/.test(cleanDb)) {
      setError("Database name contains invalid characters.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onCreate(cleanDb, cleanCol);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-shell max-w-md">
        {/* Header */}
        <div className="modal-header-compact">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-mongo shrink-0" />
            <div>
              <h3 className="modal-title">Create Database</h3>
              <p className="modal-subtitle">On connection: {connectionName}</p>
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
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-5 space-y-4">
            <div>
              <label htmlFor="db-name-input" className="form-label">
                Database Name <span className="text-mongo">*</span>
              </label>
              <input
                id="db-name-input"
                type="text"
                value={databaseName}
                onChange={(e) => setDatabaseName(e.target.value)}
                placeholder="e.g. analytics_db"
                autoFocus
                required
                className="form-input"
              />
            </div>

            <div>
              <label htmlFor="col-name-input" className="form-label">
                Initial Collection Name <span className="text-mongo">*</span>
              </label>
              <input
                id="col-name-input"
                type="text"
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                placeholder="e.g. events"
                required
                className="form-input"
              />
              <p className="text-[10px] text-gray-500 mt-1 font-mono">
                MongoDB creates the database once the first collection is initialized.
              </p>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-surface border border-guard/30 text-red-300 text-xs flex items-center gap-2 select-text cursor-text">
                <AlertTriangle className="w-4 h-4 text-guard shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Footer */}
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
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Creating..." : "Create Database"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
