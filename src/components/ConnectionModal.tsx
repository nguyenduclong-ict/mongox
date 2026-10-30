import React, { useState, useEffect } from "react";
import { ConnectionProfile, Environment, PingResult } from "../types";
import {
  Database,
  X,
  CheckCircle2,
  AlertTriangle,
  Play,
  ShieldAlert,
  Server,
  KeyRound,
  Shield,
} from "lucide-react";

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: ConnectionProfile) => Promise<ConnectionProfile>;
  onTestPing: (uri: string) => Promise<PingResult>;
  initialProfile?: ConnectionProfile | null;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onTestPing,
  initialProfile,
}) => {
  const [name, setName] = useState<string>("Local MongoDB");
  const [uri, setUri] = useState<string>("mongodb://localhost:27017");
  const [environment, setEnvironment] = useState<Environment>("local");
  const [inputMode, setInputMode] = useState<"uri" | "fields">("uri");

  // Detailed fields
  const [host, setHost] = useState<string>("localhost");
  const [port, setPort] = useState<string>("27017");
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [authDb, setAuthDb] = useState<string>("admin");
  const [enableTls, setEnableTls] = useState<boolean>(false);

  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<PingResult | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (initialProfile) {
      setName(initialProfile.name);
      setUri(initialProfile.uri);
      setEnvironment(initialProfile.environment);
    } else {
      setName("New Connection");
      setUri("mongodb://localhost:27017");
      setEnvironment("local");
    }
    setTestResult(null);
  }, [initialProfile, isOpen]);

  if (!isOpen) return null;

  const buildUriFromFields = () => {
    const authPart = username ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : "";
    const tlsPart = enableTls ? "?tls=true" : "";
    const authDbPart = username && authDb ? `&authSource=${authDb}` : "";
    return `mongodb://${authPart}${host}:${port}/${tlsPart}${authDbPart}`;
  };

  const currentEffectiveUri = inputMode === "uri" ? uri : buildUriFromFields();

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await onTestPing(currentEffectiveUri);
      setTestResult(res);
    } catch (e) {
      setTestResult({
        success: false,
        latency_ms: 0,
        server_version: null,
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const profileToSave: ConnectionProfile = {
        id: initialProfile?.id || "",
        name: name.trim() || "Untitled Connection",
        uri: currentEffectiveUri.trim(),
        environment,
        created_at: initialProfile?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await onSave(profileToSave);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-modal border border-white/10 rounded-xl shadow-modal text-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="h-14 px-6 border-b border-hairline flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-surface border border-hairline text-mongo">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight">
                {initialProfile ? "Edit Connection Profile" : "New MongoDB Connection"}
              </h2>
              <p className="text-[11px] text-gray-400">
                Configure connection parameters and environment guardrails
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-surface text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Connection Name & Environment Tag */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Profile Label
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Local Database"
                required
                className="w-full px-3 py-1.5 bg-surface border border-hairline rounded-md text-xs text-white placeholder-gray-500 focus:outline-none focus:border-mongo transition-colors font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Environment Tag
              </label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as Environment)}
                className="w-full px-3 py-1.5 bg-surface border border-hairline rounded-md text-xs text-white focus:outline-none focus:border-mongo transition-colors font-sans capitalize"
              >
                <option value="local">Local</option>
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production (Guardrails Active)</option>
              </select>
            </div>
          </div>

          {/* Environment Warning for Production */}
          {environment === "production" && (
            <div className="p-3 rounded-lg bg-guard/10 border border-guard/30 flex items-start gap-2.5 text-xs text-red-200">
              <ShieldAlert className="w-4 h-4 text-guard shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Production Guard Enabled:</span> Destructive actions (Drop DB, Drop Collection, Bulk Delete) will require explicit multi-step typed confirmation.
              </div>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="flex border-b border-hairline text-xs font-medium">
            <button
              type="button"
              onClick={() => setInputMode("uri")}
              className={`pb-2 px-3 border-b-2 transition-all ${
                inputMode === "uri"
                  ? "border-mongo text-white font-semibold"
                  : "border-transparent text-gray-400 hover:text-gray-300"
              }`}
            >
              Connection String (URI)
            </button>
            <button
              type="button"
              onClick={() => setInputMode("fields")}
              className={`pb-2 px-3 border-b-2 transition-all ${
                inputMode === "fields"
                  ? "border-mongo text-white font-semibold"
                  : "border-transparent text-gray-400 hover:text-gray-300"
              }`}
            >
              Detailed Parameters
            </button>
          </div>

          {inputMode === "uri" ? (
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                MongoDB URI
              </label>
              <input
                type="text"
                value={uri}
                onChange={(e) => setUri(e.target.value)}
                placeholder="mongodb://localhost:27017 or mongodb+srv://..."
                required
                className="w-full px-3 py-2 bg-surface border border-hairline rounded-md text-xs text-white font-mono placeholder-gray-600 focus:outline-none focus:border-mongo transition-colors"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Supports standard <code className="text-gray-300">mongodb://</code> and DNS seedlist <code className="text-gray-300">mongodb+srv://</code> formats.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Host / Server
                  </label>
                  <div className="relative">
                    <Server className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      placeholder="localhost"
                      className="w-full pl-8 pr-3 py-1.5 bg-surface border border-hairline rounded-md text-xs text-white font-mono focus:outline-none focus:border-mongo"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Port
                  </label>
                  <input
                    type="text"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="27017"
                    className="w-full px-3 py-1.5 bg-surface border border-hairline rounded-md text-xs text-white font-mono focus:outline-none focus:border-mongo"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Username (Optional)
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full px-3 py-1.5 bg-surface border border-hairline rounded-md text-xs text-white font-mono focus:outline-none focus:border-mongo"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Password (Optional)
                  </label>
                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2.5" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-8 pr-3 py-1.5 bg-surface border border-hairline rounded-md text-xs text-white font-mono focus:outline-none focus:border-mongo"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Auth Source Database
                  </label>
                  <input
                    type="text"
                    value={authDb}
                    onChange={(e) => setAuthDb(e.target.value)}
                    placeholder="admin"
                    className="w-full px-3 py-1.5 bg-surface border border-hairline rounded-md text-xs text-white font-mono focus:outline-none focus:border-mongo"
                  />
                </div>
                <div className="pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
                    <input
                      type="checkbox"
                      checked={enableTls}
                      onChange={(e) => setEnableTls(e.target.checked)}
                      className="rounded bg-surface border-hairline text-mongo focus:ring-0"
                    />
                    <Shield className="w-3.5 h-3.5 text-mongo" />
                    <span>Enable TLS / SSL Connection</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Test Ping Status Banner */}
          {testResult && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                testResult.success
                  ? "bg-mongo/10 border-mongo/30 text-emerald-300"
                  : "bg-guard/10 border-guard/30 text-red-300"
              }`}
            >
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-mongo shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-guard shrink-0" />
                )}
                <span>
                  {testResult.success
                    ? `Connected successfully (${testResult.server_version || "MongoDB"})`
                    : `Connection failed: ${testResult.error || "Unknown error"}`}
                </span>
              </div>
              {testResult.success && (
                <span className="font-mono font-semibold px-2 py-0.5 rounded bg-surface border border-mongo/30 text-mongo text-[11px]">
                  ● {testResult.latency_ms} ms
                </span>
              )}
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-4 border-t border-hairline flex items-center justify-between">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting}
              className="px-3 py-1.5 rounded-md bg-surface hover:bg-surface-hover text-xs font-medium text-gray-300 border border-hairline flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${isTesting ? "animate-spin text-mongo" : "text-gray-400"}`} />
              <span>{isTesting ? "Testing..." : "Test Connection"}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-md bg-transparent hover:bg-surface text-xs font-medium text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 rounded-md bg-mongo hover:bg-emerald-600 text-xs font-semibold text-gray-950 transition-colors shadow-sm disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save & Connect"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
