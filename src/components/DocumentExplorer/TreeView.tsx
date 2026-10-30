import React, { useState } from "react";
import { ChevronRight, ChevronDown, Copy, Edit2, Check } from "lucide-react";

interface TreeViewProps {
  documents: Record<string, unknown>[];
  onEdit: (doc: Record<string, unknown>) => void;
}

export const TreeView: React.FC<TreeViewProps> = ({ documents, onEdit }) => {
  return (
    <div className="flex-1 overflow-auto bg-canvas p-4 space-y-3 font-mono text-xs">
      {documents.map((doc, idx) => {
        const id = String(doc["_id"] || `doc-${idx}`);
        return (
          <TreeNode
            key={id}
            name={`Document #${idx + 1}`}
            value={doc}
            level={0}
            onEditDoc={() => onEdit(doc)}
          />
        );
      })}
    </div>
  );
};

interface TreeNodeProps {
  name: string;
  value: unknown;
  level: number;
  onEditDoc?: () => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ name, value, level, onEditDoc }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(level < 2);
  const [copied, setCopied] = useState<boolean>(false);

  const isObject = typeof value === "object" && value !== null;
  const isArray = Array.isArray(value);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(JSON.stringify(value, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!isObject) {
    let colorClass = "text-gray-200";
    if (typeof value === "string") colorClass = "text-emerald-300";
    if (typeof value === "number") colorClass = "text-sky-300";
    if (typeof value === "boolean") colorClass = "text-amber-300";

    return (
      <div
        className="flex items-center gap-2 py-0.5 hover:bg-surface/40 px-2 rounded group"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        <span className="text-gray-400 select-none">{name}:</span>
        <span className={`${colorClass} truncate`}>
          {typeof value === "string" ? `"${value}"` : String(value)}
        </span>
      </div>
    );
  }

  const entries = isArray
    ? (value as unknown[]).map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, unknown>);

  return (
    <div className="select-none">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between py-1 px-2 rounded hover:bg-surface/50 cursor-pointer group transition-colors"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        <div className="flex items-center gap-1.5 truncate">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          )}
          <span className="text-gray-300 font-medium">{name}</span>
          <span className="text-[10px] text-gray-500 font-mono">
            {isArray ? `Array(${entries.length})` : `Object(${entries.length})`}
          </span>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEditDoc && level === 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditDoc();
              }}
              className="p-1 rounded hover:bg-surface text-gray-400 hover:text-white"
              title="Edit Document"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-surface text-gray-400 hover:text-white"
            title="Copy JSON"
          >
            {copied ? (
              <Check className="w-3 h-3 text-mongo" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-l border-hairline/60 ml-4">
          {entries.map(([key, val]) => (
            <TreeNode
              key={key}
              name={key}
              value={val}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};
