import React from "react";
import { Edit2, Copy, Trash2, Check } from "lucide-react";

interface TableViewProps {
  documents: Record<string, unknown>[];
  onEdit: (doc: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}

export const TableView: React.FC<TableViewProps> = ({
  documents,
  onEdit,
  onDelete,
}) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  if (documents.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-gray-500 font-mono text-xs">
        No documents found matching the filter criteria.
      </div>
    );
  }

  // Extract all unique columns across documents
  const allKeys = Array.from(
    new Set(
      documents.flatMap((doc) => Object.keys(doc))
    )
  );

  // Ensure _id is first
  const columns = ["_id", ...allKeys.filter((k) => k !== "_id")];

  const handleCopy = (doc: Record<string, unknown>, id: string) => {
    navigator.clipboard.writeText(JSON.stringify(doc, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const renderValue = (val: unknown) => {
    if (val === null || val === undefined) {
      return <span className="text-gray-600 italic">null</span>;
    }
    if (typeof val === "boolean") {
      return <span className="text-amber-400 font-mono">{String(val)}</span>;
    }
    if (typeof val === "number") {
      return <span className="text-emerald-400 font-mono">{val}</span>;
    }
    if (typeof val === "string") {
      return <span className="text-gray-200 truncate">{val}</span>;
    }
    if (Array.isArray(val)) {
      return (
        <span className="text-orange-400 font-mono text-[11px] bg-orange-400/10 px-1 rounded border border-orange-400/20">
          Array[{val.length}]
        </span>
      );
    }
    if (typeof val === "object") {
      return (
        <span className="text-cyan-400 font-mono text-[11px] bg-cyan-400/10 px-1 rounded border border-cyan-400/20">
          {Object.keys(val).length > 0 ? "Object" : "{}"}
        </span>
      );
    }
    return String(val);
  };

  return (
    <div className="flex-1 overflow-auto bg-canvas">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="bg-panel border-b border-hairline sticky top-0 z-10 select-none">
            <th className="py-2 px-3 text-[10px] font-mono font-semibold text-gray-400 uppercase tracking-wider w-16 text-center border-r border-hairline">
              Actions
            </th>
            {columns.map((col) => (
              <th
                key={col}
                className={`py-2 px-3 text-[10px] font-mono font-semibold text-gray-300 uppercase tracking-wider border-r border-hairline whitespace-nowrap ${
                  col === "_id" ? "text-mongo sticky left-0 bg-panel z-20" : ""
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>{col}</span>
                  {col === "_id" && (
                    <span className="text-[9px] px-1 rounded bg-mongo/10 text-mongo border border-mongo/30">
                      PK
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {documents.map((doc, idx) => {
            const rawId = doc["_id"];
            const idStr =
              typeof rawId === "object" && rawId !== null && "$oid" in rawId
                ? String((rawId as Record<string, unknown>)["$oid"])
                : String(rawId || `row-${idx}`);

            return (
              <tr
                key={idStr}
                className="hover:bg-surface/50 group transition-colors duration-75 h-9"
              >
                {/* Actions column */}
                <td className="py-1 px-2 border-r border-hairline text-center whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(doc)}
                      className="p-1 rounded hover:bg-surface text-gray-400 hover:text-white transition-colors"
                      title="Edit Document"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleCopy(doc, idStr)}
                      className="p-1 rounded hover:bg-surface text-gray-400 hover:text-white transition-colors"
                      title="Copy Raw JSON"
                    >
                      {copiedId === idStr ? (
                        <Check className="w-3 h-3 text-mongo" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                    <button
                      onClick={() => onDelete(idStr)}
                      className="p-1 rounded hover:bg-surface text-gray-400 hover:text-guard transition-colors"
                      title="Delete Document"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </td>

                {/* Values columns */}
                {columns.map((col) => {
                  const val = doc[col];
                  const isId = col === "_id";

                  return (
                    <td
                      key={col}
                      className={`py-1.5 px-3 border-r border-hairline whitespace-nowrap max-w-xs truncate font-mono text-[11px] ${
                        isId
                          ? "sticky left-0 bg-canvas group-hover:bg-surface/90 text-purple-300 font-semibold z-10"
                          : "text-gray-300"
                      }`}
                    >
                      {renderValue(val)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
