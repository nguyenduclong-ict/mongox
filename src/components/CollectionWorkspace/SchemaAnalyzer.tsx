import React, { useState, useEffect, useCallback } from "react";
import { executeQuery } from "../../services/tauri";
import {
  BarChart3,
  RefreshCw,
  AlertTriangle,
  Layers,
} from "lucide-react";

interface SchemaAnalyzerProps {
  connectionId: string;
  database: string;
  collection: string;
}

interface FieldStats {
  name: string;
  count: number;
  percentage: number;
  types: Record<string, number>;
}

export const SchemaAnalyzer: React.FC<SchemaAnalyzerProps> = ({
  connectionId,
  database,
  collection,
}) => {
  const [fieldStats, setFieldStats] = useState<FieldStats[]>([]);
  const [sampleSize, setSampleSize] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const analyzeSchema = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await executeQuery({
        connection_id: connectionId,
        database,
        collection,
        filter: "{}",
        limit: 100,
        skip: 0,
      });

      const docs = res.documents;
      const total = docs.length;
      setSampleSize(total);

      if (total === 0) {
        setFieldStats([]);
        return;
      }

      // Analyze fields across all sampled documents
      const statsMap: Record<string, { count: number; types: Record<string, number> }> = {};

      for (const doc of docs) {
        for (const [key, val] of Object.entries(doc)) {
          if (!statsMap[key]) {
            statsMap[key] = { count: 0, types: {} };
          }
          statsMap[key].count += 1;

          let typeName = "string";
          if (val === null || val === undefined) {
            typeName = "null";
          } else if (typeof val === "boolean") {
            typeName = "boolean";
          } else if (typeof val === "number") {
            typeName = "number";
          } else if (Array.isArray(val)) {
            typeName = "array";
          } else if (typeof val === "object") {
            if ("$oid" in (val as Record<string, unknown>)) {
              typeName = "ObjectId";
            } else if ("$date" in (val as Record<string, unknown>)) {
              typeName = "date";
            } else {
              typeName = "object";
            }
          } else if (typeof val === "string") {
            if (key === "_id" || /^[0-9a-fA-F]{24}$/.test(val)) {
              typeName = "ObjectId";
            } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
              typeName = "date";
            } else {
              typeName = "string";
            }
          }

          statsMap[key].types[typeName] = (statsMap[key].types[typeName] || 0) + 1;
        }
      }

      const list: FieldStats[] = Object.entries(statsMap).map(([name, data]) => ({
        name,
        count: data.count,
        percentage: (data.count / total) * 100,
        types: data.types,
      }));

      // Sort by percentage descending, then name
      list.sort((a, b) => b.percentage - a.percentage || a.name.localeCompare(b.name));
      setFieldStats(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [connectionId, database, collection]);

  useEffect(() => {
    analyzeSchema();
  }, [analyzeSchema]);

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "string":
        return "bg-sky-400 text-sky-300";
      case "number":
        return "bg-emerald-400 text-emerald-300";
      case "boolean":
        return "bg-amber-400 text-amber-300";
      case "objectid":
        return "bg-purple-400 text-purple-300";
      case "array":
        return "bg-orange-400 text-orange-300";
      case "object":
        return "bg-cyan-400 text-cyan-300";
      case "date":
        return "bg-rose-400 text-rose-300";
      default:
        return "bg-gray-400 text-gray-300";
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-canvas overflow-y-auto p-6 space-y-5">
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-3 border-b border-hairline shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-surface border border-hairline text-mongo">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight">
              Schema Analyzer (Sampled: {sampleSize} documents)
            </h2>
            <p className="text-[11px] text-gray-400">
              Infer polymorphic field types, completion percentages, and schema drift for {database}.{collection}
            </p>
          </div>
        </div>

        <button
          onClick={analyzeSchema}
          disabled={isLoading}
          className="p-1.5 rounded-md hover:bg-surface text-gray-400 hover:text-white border border-transparent hover:border-hairline transition-colors"
          title="Re-sample Schema"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-mongo" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-guard/10 border border-guard/30 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-guard shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Field Distribution Cards */}
      <div className="space-y-3">
        {fieldStats.map((field) => {
          const isComplete = field.percentage === 100;
          const typeEntries = Object.entries(field.types);

          return (
            <div
              key={field.name}
              className="p-4 bg-panel border border-hairline rounded-xl space-y-2 hover:border-hairline/80 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-white">
                    {field.name}
                  </span>
                  {field.name === "_id" && (
                    <span className="text-[9px] px-1 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30 font-mono">
                      PRIMARY KEY
                    </span>
                  )}
                  {!isComplete && (
                    <span className="text-[9px] px-1 rounded bg-amber-400/10 text-amber-300 border border-amber-400/30 font-mono">
                      OPTIONAL
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-gray-400">
                    {field.count}/{sampleSize} docs
                  </span>
                  <span
                    className={`font-semibold ${
                      isComplete ? "text-mongo" : "text-amber-400"
                    }`}
                  >
                    {field.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Completion Progress Bar */}
              <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden border border-hairline/60">
                <div
                  className={`h-full rounded-full transition-all ${
                    isComplete ? "bg-mongo" : "bg-amber-400"
                  }`}
                  style={{ width: `${field.percentage}%` }}
                />
              </div>

              {/* Detected Type Tags */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono">
                <span className="text-gray-500">Types:</span>
                {typeEntries.map(([tName, tCount]) => {
                  const tPct = ((tCount / field.count) * 100).toFixed(0);
                  const colors = getTypeColor(tName);
                  return (
                    <span
                      key={tName}
                      className="px-2 py-0.5 rounded bg-surface border border-hairline flex items-center gap-1.5"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${colors.split(" ")[0]}`} />
                      <span className="text-gray-200 capitalize">{tName}</span>
                      <span className="text-gray-500 text-[10px]">({tPct}%)</span>
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {fieldStats.length === 0 && !isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500 font-mono text-xs">
          <Layers className="w-8 h-8 text-gray-600 mb-2" />
          <span>No documents found to sample in this collection.</span>
        </div>
      )}
    </div>
  );
};
