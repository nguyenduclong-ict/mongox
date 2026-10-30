import React, { useState } from "react";
import { ConnectionProfile, Environment, PingResult } from "../types";
import {
  Database,
  Plus,
  Play,
  Trash2,
  Edit2,
  ShieldAlert,
  Server,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface ConnectionsViewProps {
  connections: ConnectionProfile[];
  activeConnection: ConnectionProfile | null;
  onSelectConnection: (conn: ConnectionProfile) => void;
  onOpenNewModal: () => void;
  onEditProfile: (conn: ConnectionProfile) => void;
  onDeleteProfile: (id: string) => void;
  onTestPing: (uri: string) => Promise<PingResult>;
  onNavigateToExplorer: () => void;
}

export const ConnectionsView: React.FC<ConnectionsViewProps> = ({
  connections,
  activeConnection,
  onSelectConnection,
  onOpenNewModal,
  onEditProfile,
  onDeleteProfile,
  onTestPing,
  onNavigateToExplorer,
}) => {
  const [testingId, setTestingId] = useState<string | null>(null);
  const [pingResults, setPingResults] = useState<Record<string, PingResult>>({});

  const handleTest = async (conn: ConnectionProfile) => {
    setTestingId(conn.id);
    try {
      const res = await onTestPing(conn.uri);
      setPingResults((prev) => ({ ...prev, [conn.id]: res }));
    } catch (err) {
      setPingResults((prev) => ({
        ...prev,
        [conn.id]: {
          success: false,
          latency_ms: 0,
          server_version: null,
          error: err instanceof Error ? err.message : String(err),
        },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const getEnvBadge = (env: Environment) => {
    switch (env) {
      case "production":
        return {
          bg: "bg-guard/10 border-guard/30 text-red-300",
          icon: ShieldAlert,
          label: "Production",
        };
      case "staging":
        return {
          bg: "bg-purple-500/10 border-purple-500/30 text-purple-300",
          icon: ShieldCheck,
          label: "Staging",
        };
      case "development":
        return {
          bg: "bg-blue-500/10 border-blue-500/30 text-blue-300",
          icon: Server,
          label: "Development",
        };
      default:
        return {
          bg: "bg-mongo/10 border-mongo/30 text-emerald-300",
          icon: Server,
          label: "Local",
        };
    }
  };

  return (
    <div className="flex-1 bg-canvas overflow-y-auto p-6 space-y-6">
      {/* Top Banner & Header */}
      <div className="flex items-center justify-between pb-4 border-b border-hairline">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-surface border border-hairline text-mongo">
              <Database className="w-4 h-4" />
            </div>
            <h1 className="text-base font-semibold text-white tracking-tight">
              MongoDB Connection Profiles
            </h1>
          </div>
          <p className="text-xs text-gray-400">
            Manage local instances, staging clusters, and production databases with active guardrails
          </p>
        </div>

        <button
          onClick={onOpenNewModal}
          className="px-3 py-1.5 rounded-md bg-mongo hover:bg-emerald-600 text-xs font-semibold text-gray-950 flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Connection</span>
        </button>
      </div>

      {/* Grid of Connections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {connections.map((conn) => {
          const isActive = activeConnection?.id === conn.id;
          const badge = getEnvBadge(conn.environment);
          const BadgeIcon = badge.icon;
          const ping = pingResults[conn.id];
          const isTesting = testingId === conn.id;

          return (
            <div
              key={conn.id}
              className={`p-4 rounded-xl border transition-all duration-150 flex flex-col justify-between ${
                isActive
                  ? "bg-panel border-mongo shadow-sm"
                  : "bg-panel border-hairline hover:border-hairline/80"
              }`}
            >
              <div>
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white tracking-tight font-sans">
                      {conn.name}
                    </span>
                    {isActive && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-mongo/20 border border-mongo/30 text-mongo font-semibold">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  {/* Environment Tag */}
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${badge.bg}`}
                  >
                    <BadgeIcon className="w-3 h-3" />
                    <span>{badge.label}</span>
                  </span>
                </div>

                {/* Sanitized URI */}
                <div className="text-xs font-mono text-gray-400 bg-surface/70 border border-hairline rounded px-2.5 py-1.5 truncate mb-3">
                  {conn.uri}
                </div>

                {/* Ping latency indicator */}
                {ping && (
                  <div
                    className={`text-[11px] p-2 rounded border mb-3 flex items-center justify-between ${
                      ping.success
                        ? "bg-mongo/10 border-mongo/20 text-emerald-300"
                        : "bg-guard/10 border-guard/20 text-red-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {ping.success ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-mongo" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-guard" />
                      )}
                      <span>
                        {ping.success
                          ? `Ready (${ping.server_version || "MongoDB"})`
                          : ping.error || "Failed"}
                      </span>
                    </div>
                    {ping.success && (
                      <span className="font-mono font-semibold">
                        ● {ping.latency_ms} ms
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-hairline flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleTest(conn)}
                    disabled={isTesting}
                    className="p-1.5 rounded hover:bg-surface text-gray-400 hover:text-gray-200 border border-transparent hover:border-hairline transition-colors text-xs flex items-center gap-1"
                    title="Ping Connection"
                  >
                    <Play
                      className={`w-3.5 h-3.5 ${
                        isTesting ? "animate-spin text-mongo" : ""
                      }`}
                    />
                    <span className="text-[11px]">{isTesting ? "Pinging..." : "Ping"}</span>
                  </button>

                  <button
                    onClick={() => onEditProfile(conn)}
                    className="p-1.5 rounded hover:bg-surface text-gray-400 hover:text-gray-200 border border-transparent hover:border-hairline transition-colors"
                    title="Edit Connection Profile"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onDeleteProfile(conn.id)}
                    className="p-1.5 rounded hover:bg-surface text-gray-400 hover:text-guard border border-transparent hover:border-hairline transition-colors"
                    title="Delete Connection"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {!isActive ? (
                    <button
                      onClick={() => onSelectConnection(conn)}
                      className="px-2.5 py-1 rounded bg-surface hover:bg-surface-hover text-xs font-medium text-gray-300 border border-hairline transition-colors"
                    >
                      Set Active
                    </button>
                  ) : (
                    <button
                      onClick={onNavigateToExplorer}
                      className="px-2.5 py-1 rounded bg-mongo/10 hover:bg-mongo/20 text-xs font-semibold text-mongo border border-mongo/30 flex items-center gap-1 transition-colors"
                    >
                      <span>Open Explorer</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
