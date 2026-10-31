import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface RawJsonViewProps {
  documents: Record<string, unknown>[];
}

export const RawJsonView: React.FC<RawJsonViewProps> = ({ documents }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const jsonString = JSON.stringify(documents, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex-1 flex flex-col bg-canvas overflow-hidden">
      <div className="h-8 px-4 bg-panel border-b border-hairline flex items-center justify-between text-xs text-gray-400 shrink-0">
        <span className="font-mono text-[11px]">Raw JSON Stream ({documents.length} records)</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface hover:bg-surface-hover text-gray-300 border border-hairline transition-colors text-[11px]"
        >
          {copied ? <Check className="w-3 h-3 text-mongo" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? "Copied" : "Copy All"}</span>
        </button>
      </div>

      <pre className="flex-1 p-4 overflow-auto font-mono text-xs text-gray-200 leading-relaxed selection:bg-mongo/30 select-text cursor-text">
        <code className="select-text">{jsonString}</code>
      </pre>
    </div>
  );
};
