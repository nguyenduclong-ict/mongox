import React, { useState, useRef, useEffect } from "react";
import { Edit2, Copy, Trash2, Check, Lock } from "lucide-react";

interface TableViewProps {
  documents: Record<string, unknown>[];
  onEdit: (doc: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  onUpdateCell?: (docId: string, field: string, newValue: unknown) => Promise<void>;
}

const ROW_HEIGHT = 36; // 36px fixed row height for strict Linear layout
const OVERSCAN = 10;

export const TableView: React.FC<TableViewProps> = ({
  documents,
  onEdit,
  onDelete,
  onUpdateCell,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ docId: string; col: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [isSavingCell, setIsSavingCell] = useState<boolean>(false);

  // Virtualization state
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [containerHeight, setContainerHeight] = useState<number>(600);

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  if (documents.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-gray-500 font-mono text-xs">
        No documents found matching the filter criteria.
      </div>
    );
  }

  // Extract all unique columns across documents
  const allKeys = Array.from(new Set(documents.flatMap((doc) => Object.keys(doc))));
  const columns = ["_id", ...allKeys.filter((k) => k !== "_id")];

  const handleCopy = (doc: Record<string, unknown>, id: string) => {
    navigator.clipboard.writeText(JSON.stringify(doc, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleStartEdit = (docId: string, col: string, val: unknown) => {
    if (col === "_id" || !onUpdateCell) return;
    setEditingCell({ docId, col });
    if (val === null || val === undefined) {
      setEditValue("");
    } else if (typeof val === "object") {
      setEditValue(JSON.stringify(val));
    } else {
      setEditValue(String(val));
    }
  };

  const handleCommitEdit = async (docId: string, col: string) => {
    if (!onUpdateCell || isSavingCell) return;
    setIsSavingCell(true);
    try {
      let parsed: unknown = editValue;
      const trimmed = editValue.trim();
      if (trimmed === "null") {
        parsed = null;
      } else if (trimmed === "true") {
        parsed = true;
      } else if (trimmed === "false") {
        parsed = false;
      } else if (!isNaN(Number(trimmed)) && trimmed !== "") {
        parsed = Number(trimmed);
      } else if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          parsed = JSON.parse(trimmed);
        } catch {
          parsed = editValue;
        }
      }
      await onUpdateCell(docId, col, parsed);
      setEditingCell(null);
    } finally {
      setIsSavingCell(false);
    }
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
        <span className="text-orange-400 font-mono text-[10px] bg-orange-400/10 px-1 py-0.2 rounded border border-orange-400/20">
          Array[{val.length}]
        </span>
      );
    }
    if (typeof val === "object") {
      return (
        <span className="text-cyan-400 font-mono text-[10px] bg-cyan-400/10 px-1 py-0.2 rounded border border-cyan-400/20">
          Object
        </span>
      );
    }
    return String(val);
  };

  // Virtualization slice
  const totalCount = documents.length;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    totalCount,
    Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN
  );

  const paddingTop = startIndex * ROW_HEIGHT;
  const paddingBottom = Math.max(0, (totalCount - endIndex) * ROW_HEIGHT);
  const visibleRows = documents.slice(startIndex, endIndex);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-auto bg-canvas relative"
    >
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="bg-panel border-b border-hairline sticky top-0 z-30 select-none h-9">
            <th className="py-2 px-3 text-[10px] font-mono font-semibold text-gray-400 uppercase tracking-wider w-16 text-center border-r border-hairline bg-panel">
              Actions
            </th>
            {columns.map((col) => (
              <th
                key={col}
                className={`py-2 px-3 text-[10px] font-mono font-semibold text-gray-300 uppercase tracking-wider border-r border-hairline whitespace-nowrap bg-panel ${
                  col === "_id" ? "text-mongo sticky left-0 z-40 bg-panel shadow-r" : ""
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
          {paddingTop > 0 && (
            <tr>
              <td style={{ height: `${paddingTop}px` }} colSpan={columns.length + 1} />
            </tr>
          )}

          {visibleRows.map((doc, visibleIdx) => {
            const actualIdx = startIndex + visibleIdx;
            const rawId = doc["_id"];
            const idStr =
              typeof rawId === "object" && rawId !== null && "$oid" in rawId
                ? String((rawId as Record<string, unknown>)["$oid"])
                : String(rawId || `row-${actualIdx}`);

            return (
              <tr
                key={idStr}
                style={{ height: `${ROW_HEIGHT}px` }}
                className="hover:bg-surface/50 group transition-colors duration-75"
              >
                {/* Actions column */}
                <td className="py-1 px-2 border-r border-hairline text-center whitespace-nowrap bg-canvas group-hover:bg-surface/50">
                  <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(doc)}
                      className="p-1 rounded hover:bg-surface text-gray-400 hover:text-white transition-colors"
                      title="Edit Document Payload"
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

                {/* Document columns */}
                {columns.map((col) => {
                  const val = doc[col];
                  const isId = col === "_id";
                  const isEditingThis =
                    editingCell?.docId === idStr && editingCell?.col === col;

                  return (
                    <td
                      key={col}
                      onDoubleClick={() => handleStartEdit(idStr, col, val)}
                      className={`py-1.5 px-3 border-r border-hairline whitespace-nowrap max-w-xs truncate font-mono text-[11px] ${
                        isId
                          ? "sticky left-0 bg-canvas group-hover:bg-surface/90 text-purple-300 font-semibold z-20 cursor-not-allowed"
                          : "text-gray-300 cursor-cell hover:bg-surface/60"
                      }`}
                      title={
                        isId
                          ? "Immutable primary key (_id)"
                          : "Double-click to edit cell directly"
                      }
                    >
                      {isEditingThis ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleCommitEdit(idStr, col);
                            } else if (e.key === "Escape") {
                              setEditingCell(null);
                            }
                          }}
                          onBlur={() => handleCommitEdit(idStr, col)}
                          autoFocus
                          disabled={isSavingCell}
                          className="w-full px-1.5 py-0.5 bg-panel border border-mongo rounded text-white font-mono text-[11px] focus:outline-none shadow-sm"
                        />
                      ) : (
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate">{renderValue(val)}</span>
                          {isId && (
                            <Lock className="w-2.5 h-2.5 text-gray-600 shrink-0" />
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}

          {paddingBottom > 0 && (
            <tr>
              <td style={{ height: `${paddingBottom}px` }} colSpan={columns.length + 1} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
