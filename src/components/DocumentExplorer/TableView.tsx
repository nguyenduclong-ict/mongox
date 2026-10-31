import React, { useState, useRef, useEffect } from "react";
import { Edit2, Copy, Trash2, Check, Lock, X, ArrowUp, ArrowDown, ArrowUpDown, FileJson } from "lucide-react";
import { Checkbox } from "../ui/Checkbox";
import { ContextMenu } from "../ContextMenu";

interface TableViewProps {
  documents: Record<string, unknown>[];
  onEdit: (doc: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  onUpdateCell?: (docId: string, field: string, newValue: unknown) => Promise<void>;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onSelectAll?: (select: boolean) => void;
  onSortChange?: (field: string, direction: 1 | -1 | 0) => void;
  currentSortField?: string;
  currentSortDir?: 1 | -1;
  onToast?: (type: "info" | "success" | "loading" | "error", message: string, id?: string) => string;
}

const ROW_HEIGHT = 36;
const OVERSCAN = 10;

export const TableView: React.FC<TableViewProps> = ({
  documents,
  onEdit,
  onDelete,
  onUpdateCell,
  selectedIds = new Set(),
  onToggleSelect,
  onSelectAll,
  onSortChange,
  currentSortField,
  currentSortDir,
  onToast,
}) => {
  const [copiedValToast, setCopiedValToast] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ docId: string; col: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [isSavingCell, setIsSavingCell] = useState<boolean>(false);
  const [optimisticValues, setOptimisticValues] = useState<Record<string, Record<string, unknown>>>({});
  const [rowContextMenu, setRowContextMenu] = useState<{
    x: number;
    y: number;
    doc: Record<string, unknown>;
    idStr: string;
  } | null>(null);

  // Virtualization state
  const containerRef = useRef<HTMLDivElement>(null);
  const editContainerRef = useRef<HTMLDivElement>(null);
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

  // Click outside to cancel inline editing
  useEffect(() => {
    if (!editingCell) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (editContainerRef.current && !editContainerRef.current.contains(e.target as Node)) {
        setEditingCell(null);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [editingCell]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  if (documents.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-400">
        <p className="text-sm font-mono">No documents found matching the filter criteria.</p>
      </div>
    );
  }

  // Extract all unique columns across documents
  const allKeys = Array.from(new Set(documents.flatMap((doc) => Object.keys(doc))));
  const columns = ["_id", ...allKeys.filter((k) => k !== "_id")];

  const handleCopy = (doc: Record<string, unknown>, _id: string) => {
    navigator.clipboard.writeText(JSON.stringify(doc, null, 2));
    setCopiedValToast("Copied Document JSON.");
    setTimeout(() => setCopiedValToast(null), 1500);
  };

  const handleCopyId = (idStr: string) => {
    navigator.clipboard.writeText(idStr);
    setCopiedValToast(`Copied ID: ${idStr}`);
    setTimeout(() => setCopiedValToast(null), 1500);
  };

  const handleHeaderClick = (col: string) => {
    if (!onSortChange) return;
    if (currentSortField === col) {
      if (currentSortDir === 1) {
        onSortChange(col, -1);
      } else if (currentSortDir === -1) {
        onSortChange(col, 0);
      } else {
        onSortChange(col, 1);
      }
    } else {
      onSortChange(col, 1);
    }
  };

  const handleCopyValue = (val: unknown) => {
    const text = val === null || val === undefined ? "" : typeof val === "object" ? JSON.stringify(val) : String(val);
    navigator.clipboard.writeText(text);
    setCopiedValToast("Copied value to clipboard.");
    setTimeout(() => setCopiedValToast(null), 1500);
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

    // 1. Immediately dismiss inline edit inputs and buttons
    setEditingCell(null);

    // 2. Optimistic local state update
    setOptimisticValues((prev) => ({
      ...prev,
      [docId]: { ...(prev[docId] || {}), [col]: parsed },
    }));

    // 3. Trigger floating Toast notification
    const toastId = onToast
      ? onToast("loading", `Saving change to ${col}...`)
      : undefined;

    setIsSavingCell(true);
    try {
      await onUpdateCell(docId, col, parsed);
      onToast?.("success", "Cell updated successfully.", toastId);
    } catch (err: any) {
      onToast?.("error", `Failed to save ${col}: ${err?.message || err}`, toastId);
      // Revert optimistic update
      setOptimisticValues((prev) => {
        const copy = { ...prev };
        if (copy[docId]) {
          delete copy[docId][col];
        }
        return copy;
      });
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
      return <span className="text-gray-200 select-text cursor-text">{val}</span>;
    }
    if (Array.isArray(val)) {
      return (
        <span className="text-orange-400 font-mono text-[10px] bg-orange-400/10 px-1 py-0.2 rounded border border-orange-400/20 select-text">
          Array[{val.length}]
        </span>
      );
    }
    if (typeof val === "object") {
      return (
        <span className="text-cyan-400 font-mono text-[10px] bg-cyan-400/10 px-1 py-0.2 rounded border border-cyan-400/20 select-text">
          Object
        </span>
      );
    }
    return <span className="select-text">{String(val)}</span>;
  };

  // Virtualization math
  const totalCount = documents.length;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    totalCount,
    Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN
  );

  const paddingTop = startIndex * ROW_HEIGHT;
  const paddingBottom = (totalCount - endIndex) * ROW_HEIGHT;
  const visibleRows = documents.slice(startIndex, endIndex);

  const allSelected = documents.length > 0 && selectedIds.size === documents.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < documents.length;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-auto relative [scrollbar-gutter:stable] bg-canvas"
    >
      {/* Toast alert */}
      {copiedValToast && (
        <div className="absolute right-4 top-2 z-50 bg-panel border border-mongo/40 text-emerald-300 text-[11px] font-mono px-3 py-1 rounded shadow-modal animate-in fade-in">
          {copiedValToast}
        </div>
      )}

      <table className="w-full border-collapse text-left text-xs table-fixed">
        <thead>
          <tr className="bg-panel border-b border-hairline sticky top-0 z-30 select-none h-9">
            {/* Multi-select header checkbox (Sticky left-0) */}
            {onSelectAll && (
              <th className="py-2 px-2.5 w-10 text-center border-r border-hairline bg-panel shrink-0 sticky left-0 z-40">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={(c) => onSelectAll(c)}
                />
              </th>
            )}

            {columns.map((col) => {
              const isId = col === "_id";
              const isSorted = currentSortField === col;
              return (
                <th
                  key={col}
                  onClick={() => handleHeaderClick(col)}
                  className={`py-2 px-3 text-[10px] font-mono font-semibold uppercase tracking-wider border-r border-hairline whitespace-nowrap bg-panel select-none cursor-pointer hover:bg-surface/60 transition-colors group/th ${
                    isId
                      ? "text-mongo sticky left-10 z-40 bg-panel shadow-r w-48 shrink-0"
                      : "w-44 text-gray-300"
                  }`}
                  title={`Sort by ${col}`}
                >
                  <div className="flex items-center justify-between gap-1.5 truncate">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="truncate">{col}</span>
                      {isId && (
                        <span className="text-[9px] px-1 rounded bg-mongo/10 text-mongo border border-mongo/30 shrink-0">
                          PK
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-gray-400">
                      {isSorted ? (
                        currentSortDir === 1 ? (
                          <ArrowUp className="w-3 h-3 text-mongo" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-mongo" />
                        )
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 opacity-0 group-hover/th:opacity-100 text-gray-500" />
                      )}
                    </span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody className="divide-y divide-hairline">
          {paddingTop > 0 && (
            <tr>
              <td style={{ height: `${paddingTop}px` }} colSpan={columns.length + (onSelectAll ? 1 : 0)} />
            </tr>
          )}

          {visibleRows.map((doc, visibleIdx) => {
            const actualIdx = startIndex + visibleIdx;
            const rawId = doc["_id"];
            const idStr =
              typeof rawId === "object" && rawId !== null && "$oid" in rawId
                ? String((rawId as Record<string, unknown>)["$oid"])
                : String(rawId || `row-${actualIdx}`);

            const isSelected = selectedIds.has(idStr);

            return (
              <tr
                key={idStr}
                style={{ height: `${ROW_HEIGHT}px` }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setRowContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    doc,
                    idStr,
                  });
                }}
                className={`hover:bg-surface/50 group transition-colors duration-75 ${
                  isSelected ? "bg-mongo/5" : ""
                }`}
              >
                {/* Multi-select row checkbox (Sticky left-0) */}
                {onToggleSelect && (
                  <td className="py-1 px-2.5 w-10 text-center border-r border-hairline bg-canvas group-hover:bg-surface/50 sticky left-0 z-20 shrink-0">
                    <Checkbox
                      checked={isSelected}
                      onChange={() => onToggleSelect(idStr)}
                    />
                  </td>
                )}

                {/* Document columns */}
                {columns.map((col) => {
                  const val =
                    optimisticValues[idStr]?.[col] !== undefined
                      ? optimisticValues[idStr][col]
                      : doc[col];
                  const isId = col === "_id";
                  const isEditingThis =
                    editingCell?.docId === idStr && editingCell?.col === col;

                  return (
                    <td
                      key={col}
                      onDoubleClick={() => handleStartEdit(idStr, col, val)}
                      className={`py-1.5 px-3 border-r border-hairline font-mono text-[11px] overflow-hidden ${
                        isId
                          ? "sticky left-10 bg-canvas group-hover:bg-surface/90 text-purple-300 font-semibold z-20 cursor-not-allowed w-48 shrink-0 shadow-r"
                          : "text-gray-300 cursor-cell hover:bg-surface/60 w-44 shrink-0"
                      }`}
                      title={
                        isId
                          ? "Immutable primary key (_id)"
                          : "Double-click to edit cell"
                      }
                    >
                      {isEditingThis ? (
                        <div
                          ref={editContainerRef}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 w-full min-w-0"
                        >
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
                            autoFocus
                            disabled={isSavingCell}
                            className="flex-1 min-w-0 px-1 py-0.5 bg-panel border border-mongo rounded text-white font-mono text-[11px] focus:outline-none shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => handleCommitEdit(idStr, col)}
                            disabled={isSavingCell}
                            className="p-1 rounded bg-mongo text-gray-950 hover:bg-emerald-400 shrink-0"
                            title="Save (Enter)"
                          >
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCell(null)}
                            className="p-1 rounded bg-surface hover:bg-surface-hover text-gray-400 hover:text-white shrink-0"
                            title="Cancel (Esc)"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-1 w-full min-w-0 group/cell">
                          <span className="truncate select-text selection:bg-mongo/30 selection:text-white">
                            {renderValue(val)}
                          </span>
                          <div className="flex items-center shrink-0">
                            {isId ? (
                              <Lock className="w-2.5 h-2.5 text-gray-600" />
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyValue(val);
                                }}
                                className="opacity-0 group-hover/cell:opacity-100 p-0.5 rounded text-gray-500 hover:text-white transition-opacity"
                                title="Copy Value"
                              >
                                <Copy className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
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
              <td style={{ height: `${paddingBottom}px` }} colSpan={columns.length + (onSelectAll ? 1 : 0)} />
            </tr>
          )}
        </tbody>
      </table>

      {/* Row Context Menu */}
      {rowContextMenu && (
        <ContextMenu
          x={rowContextMenu.x}
          y={rowContextMenu.y}
          onClose={() => setRowContextMenu(null)}
          items={[
            {
              label: "Edit Document",
              icon: Edit2,
              onClick: () => {
                onEdit(rowContextMenu.doc);
                setRowContextMenu(null);
              },
            },
            {
              label: "Copy Document JSON",
              icon: FileJson,
              onClick: () => {
                handleCopy(rowContextMenu.doc, rowContextMenu.idStr);
                setRowContextMenu(null);
              },
            },
            {
              label: "Copy Document ID",
              icon: Copy,
              onClick: () => {
                handleCopyId(rowContextMenu.idStr);
                setRowContextMenu(null);
              },
            },
            { divider: true },
            {
              label: "Delete Document",
              icon: Trash2,
              danger: true,
              onClick: () => {
                onDelete(rowContextMenu.idStr);
                setRowContextMenu(null);
              },
            },
          ]}
        />
      )}
    </div>
  );
};
