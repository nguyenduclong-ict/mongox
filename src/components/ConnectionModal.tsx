import React, { useState, useEffect } from "react";
import {
  ConnectionProfile,
  ConnectionColor,
  ConnectionType,
  Environment,
  PingResult,
} from "../types";
import {
  Server,
  X,
  Check,
  CheckCircle2,
  AlertTriangle,
  Play,
  Eye,
  EyeOff,
  Copy,
  FileCode,
  Info,
  ShieldAlert,
} from "lucide-react";
import { FilePickerButton } from "./ui/FilePickerButton";
import { Checkbox } from "./ui/Checkbox";
import { Tabs } from "./ui/Tabs";

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: ConnectionProfile, autoConnect?: boolean) => Promise<ConnectionProfile>;
  onTestPing: (uri: string) => Promise<PingResult>;
  initialProfile?: ConnectionProfile | null;
}

type TabKey = "basic" | "ssl" | "ssh" | "encryption" | "more";

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onTestPing,
  initialProfile,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>("basic");

  // Basic Tab State
  const [connectionType, setConnectionType] = useState<ConnectionType>("direct");
  const [host, setHost] = useState<string>("localhost");
  const [port, setPort] = useState<string>("27017");
  const [isSrv, setIsSrv] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [color, setColor] = useState<ConnectionColor>("none");
  const [readOnly, setReadOnly] = useState<boolean>(false);
  const [environment, setEnvironment] = useState<Environment>("local");

  // Authentication Tab State
  const [authMode, setAuthMode] = useState<string>("SCRAM-SHA-256");
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authDb, setAuthDb] = useState<string>("admin");

  // SSL Tab State
  const [useTls, setUseTls] = useState<boolean>(false);
  const [tlsProtocol, setTlsProtocol] = useState<string>("any");
  const [caFile, setCaFile] = useState<string>("");
  const [clientCertFile, setClientCertFile] = useState<string>("");
  const [clientKeyFile, setClientKeyFile] = useState<string>("");
  const [keyPassphrase, setKeyPassphrase] = useState<string>("");
  const [allowInvalidCerts, setAllowInvalidCerts] = useState<boolean>(false);

  // SSH Tab State
  const [useSsh, setUseSsh] = useState<boolean>(false);
  const [sshHost, setSshHost] = useState<string>("");
  const [sshPort, setSshPort] = useState<string>("22");
  const [sshUser, setSshUser] = useState<string>("");
  const [sshAuthMode, setSshAuthMode] = useState<"password" | "key">("password");
  const [sshPassword, setSshPassword] = useState<string>("");
  const [sshKeyFile, setSshKeyFile] = useState<string>("");
  const [sshPassphrase, setSshPassphrase] = useState<string>("");

  // In-Use Encryption Tab State
  const [useCsfle, setUseCsfle] = useState<boolean>(false);
  const [kmsProvider, setKmsProvider] = useState<string>("local");
  const [keyVaultNamespace, setKeyVaultNamespace] = useState<string>("encryption.__keyVault");
  const [kmsMasterKey, setKmsMasterKey] = useState<string>("");

  // More Tab State
  const [defaultDb, setDefaultDb] = useState<string>("");
  const [connectTimeout, setConnectTimeout] = useState<number>(30000);
  const [socketTimeout, setSocketTimeout] = useState<number>(30000);
  const [readPreference, setReadPreference] = useState<string>("primary");
  const [replicaSetName, setReplicaSetName] = useState<string>("");

  // Utilities / Modals State
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<PingResult | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showFromUriModal, setShowFromUriModal] = useState<boolean>(false);
  const [rawUriInput, setRawUriInput] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Helper to parse MongoDB URI into form fields
  const parseAndPopulateUri = (uriStr: string) => {
    try {
      const cleanUri = uriStr.trim();
      const srv = cleanUri.startsWith("mongodb+srv://");
      const normalized = cleanUri.replace(/^mongodb(\+srv)?:\/\//, "http://");
      const url = new URL(normalized);

      setIsSrv(srv);
      if (srv) {
        setHost(url.hostname || "localhost");
        setPort("");
      } else {
        setHost(url.hostname || "localhost");
        setPort(url.port || "27017");
      }

      if (url.username) {
        setUsername(decodeURIComponent(url.username));
      }
      if (url.password) {
        setPassword(decodeURIComponent(url.password));
      }

      const pathDb = url.pathname ? url.pathname.replace(/^\//, "") : "";
      if (pathDb) {
        setDefaultDb(pathDb);
      }

      const params = url.searchParams;
      const parsedAuthSource = params.get("authSource");
      if (parsedAuthSource) {
        setAuthDb(parsedAuthSource);
      } else if (pathDb) {
        setAuthDb(pathDb);
      }

      const mech = params.get("authMechanism");
      if (mech) {
        setAuthMode(mech);
      } else if (url.username) {
        setAuthMode("SCRAM-SHA-256");
      }

      const tlsParam = params.get("tls") === "true" || params.get("ssl") === "true";
      setUseTls(tlsParam);

      const invalidCert =
        params.get("tlsAllowInvalidCertificates") === "true" ||
        params.get("tlsInsecure") === "true";
      setAllowInvalidCerts(invalidCert);

      const rs = params.get("replicaSet");
      if (rs) {
        setReplicaSetName(rs);
        setConnectionType("replica_set");
      }

      const rp = params.get("readPreference");
      if (rp) {
        setReadPreference(rp);
      }

      const ct = params.get("connectTimeoutMS");
      if (ct) setConnectTimeout(Number(ct));

      const st = params.get("socketTimeoutMS");
      if (st) setSocketTimeout(Number(st));

      const ro = params.get("readOnly") === "true";
      setReadOnly(ro);

      if (!name || name === "New Connection") {
        setName(pathDb || `${url.hostname}:${url.port || (srv ? "" : "27017")}`);
      }

      showNotification("URI parsed and applied to all tabs.");
      setShowFromUriModal(false);
      return true;
    } catch {
      showNotification("Failed to parse URI: Invalid MongoDB format.");
      return false;
    }
  };

  // Helper to build MongoDB URI from all current fields
  const buildCurrentUri = (): string => {
    const scheme = isSrv ? "mongodb+srv://" : "mongodb://";
    let authPart = "";
    if (username.trim()) {
      const u = encodeURIComponent(username.trim());
      const p = password ? `:${encodeURIComponent(password)}` : "";
      authPart = `${u}${p}@`;
    }

    const hostPart = isSrv
      ? host.trim() || "localhost"
      : `${host.trim() || "localhost"}:${port.trim() || "27017"}`;

    const dbPart = defaultDb.trim() ? `/${encodeURIComponent(defaultDb.trim())}` : "/";

    const queryParams: string[] = [];
    if (username.trim() && authDb.trim() && authDb.trim() !== defaultDb.trim()) {
      queryParams.push(`authSource=${encodeURIComponent(authDb.trim())}`);
    }
    if (authMode && authMode !== "SCRAM-SHA-256" && authMode !== "None") {
      queryParams.push(`authMechanism=${encodeURIComponent(authMode)}`);
    }
    if (useTls) {
      queryParams.push("tls=true");
    }
    if (allowInvalidCerts) {
      queryParams.push("tlsAllowInvalidCertificates=true");
    }
    if (connectionType === "replica_set" && replicaSetName.trim()) {
      queryParams.push(`replicaSet=${encodeURIComponent(replicaSetName.trim())}`);
    }
    if (readPreference && readPreference !== "primary") {
      queryParams.push(`readPreference=${encodeURIComponent(readPreference)}`);
    }
    if (connectTimeout !== 30000) {
      queryParams.push(`connectTimeoutMS=${connectTimeout}`);
    }
    if (socketTimeout !== 30000) {
      queryParams.push(`socketTimeoutMS=${socketTimeout}`);
    }
    if (readOnly) {
      queryParams.push("readOnly=true");
    }

    const queryPart = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
    return `${scheme}${authPart}${hostPart}${dbPart}${queryPart}`;
  };

  useEffect(() => {
    if (initialProfile) {
      setName(initialProfile.name);
      setEnvironment(initialProfile.environment || "local");
      setColor(initialProfile.color || "none");
      setConnectionType(initialProfile.connectionType || "direct");
      setHost(initialProfile.host || "localhost");
      setPort(initialProfile.port ? String(initialProfile.port) : "27017");
      setIsSrv(Boolean(initialProfile.isSrv));
      setReadOnly(Boolean(initialProfile.readOnly));
      setAuthMode(initialProfile.authMechanism || "SCRAM-SHA-256");
      setUsername(initialProfile.username || "");
      setAuthDb(initialProfile.authDb || "admin");
      setUseTls(Boolean(initialProfile.useTls));
      setUseSsh(Boolean(initialProfile.useSsh));
      setSshHost(initialProfile.sshHost || "");
      setSshPort(initialProfile.sshPort ? String(initialProfile.sshPort) : "22");
      setSshUser(initialProfile.sshUser || "");
      setDefaultDb(initialProfile.defaultDb || "");

      // If initialProfile has a URI, parse it to fill any remaining fields
      if (initialProfile.uri) {
        parseAndPopulateUri(initialProfile.uri);
      }
    } else {
      setName("");
      setHost("localhost");
      setPort("27017");
      setIsSrv(false);
      setColor("none");
      setReadOnly(false);
      setEnvironment("local");
      setAuthMode("SCRAM-SHA-256");
      setUsername("");
      setPassword("");
      setAuthDb("admin");
      setUseTls(false);
      setUseSsh(false);
      setDefaultDb("");
    }
    setActiveTab("basic");
    setTestResult(null);
  }, [initialProfile, isOpen]);

  if (!isOpen) return null;

  const currentUri = buildCurrentUri();

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await onTestPing(currentUri);
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

  const handleCopyToClipboard = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(currentUri);
      }
    } catch {
      // headless fallback
    }
    showNotification("URI copied to clipboard.");
  };

  const handleSaveInternal = async (autoConnect: boolean) => {
    setIsSaving(true);
    try {
      const profileToSave: ConnectionProfile = {
        id: initialProfile?.id || "",
        name: name.trim() || `${host}:${port || "27017"}`,
        uri: currentUri.trim(),
        environment,
        color,
        connectionType,
        host: host.trim(),
        port: isSrv ? undefined : Number(port) || 27017,
        isSrv,
        readOnly,
        authMechanism: authMode,
        username: username.trim() || undefined,
        authDb: authDb.trim() || "admin",
        useTls,
        useSsh,
        sshHost: useSsh ? sshHost.trim() : undefined,
        sshPort: useSsh ? Number(sshPort) || 22 : undefined,
        sshUser: useSsh ? sshUser.trim() : undefined,
        defaultDb: defaultDb.trim() || undefined,
        created_at: initialProfile?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await onSave(profileToSave, autoConnect);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-modal border border-white/10 rounded-xl shadow-modal text-gray-200 overflow-hidden flex flex-col h-[580px] min-h-[560px] max-h-[92vh] font-sans">
        {/* Title Bar matching NoSQLBooster standard */}
        <div className="px-5 py-3.5 border-b border-hairline flex items-center justify-between shrink-0 bg-modal">
          <div className="flex items-center gap-2.5">
            <Server className="w-4 h-4 text-mongo shrink-0" />
            <h2 className="text-sm font-semibold text-white tracking-tight">
              Connection Editor - {name.trim() || "New Connection"}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-md hover:bg-white/[0.06] text-gray-400 hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs: Basic, SSL, SSH, In-Use Encryption, More */}
        <Tabs<TabKey>
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: "basic", label: "Basic" },
            { id: "ssl", label: "SSL" },
            { id: "ssh", label: "SSH" },
            { id: "encryption", label: "In-Use Encryption" },
            { id: "more", label: "More" },
          ]}
        />

        {/* Toast Notification Banner */}
        {toastMessage && (
          <div className="bg-mongo/20 border-b border-mongo/30 px-4 py-1.5 text-xs text-emerald-300 font-mono flex items-center justify-between">
            <span>{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-white">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Tab Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 font-sans text-xs min-h-[440px]">
          {/* TAB 1: BASIC */}
          {activeTab === "basic" && (
            <div className="space-y-4">
              {/* Type */}
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-gray-300 font-medium">Type</label>
                <div className="col-span-3">
                  <select
                    value={connectionType}
                    onChange={(e) => setConnectionType(e.target.value as ConnectionType)}
                    className="w-full px-3 py-1.5 bg-surface border border-hairline rounded text-white focus:outline-none focus:border-mongo font-sans"
                  >
                    <option value="direct">Single Server or DNS Seedlist</option>
                    <option value="replica_set">Replica Set</option>
                    <option value="sharded">Sharded Cluster</option>
                  </select>
                </div>
              </div>

              {/* Server: Host : Port + SRV Record checkbox */}
              <div className="grid grid-cols-4 items-start gap-4">
                <label className="text-gray-300 font-medium pt-1.5">Server</label>
                <div className="col-span-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      id="conn-host-input"
                      type="text"
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      placeholder="localhost"
                      className="flex-1 px-3 py-1.5 bg-surface border border-hairline rounded font-mono text-white placeholder-gray-500 focus:outline-none focus:border-mongo"
                    />
                    <span className="text-gray-400 font-bold">:</span>
                    <input
                      id="conn-port-input"
                      type="text"
                      value={port}
                      disabled={isSrv}
                      onChange={(e) => setPort(e.target.value)}
                      placeholder="27017"
                      className="w-24 px-3 py-1.5 bg-surface border border-hairline rounded font-mono text-white placeholder-gray-500 focus:outline-none focus:border-mongo disabled:opacity-40"
                    />
                  </div>

                  <Checkbox
                    checked={isSrv}
                    onChange={(c) => setIsSrv(c)}
                    label="SRV Record"
                  />
                </div>
              </div>

              {/* Name * */}
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-gray-300 font-medium">
                  Name <span className="text-mongo">*</span>
                </label>
                <div className="col-span-3">
                  <input
                    id="conn-name-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. ai-web-cli or Local Database"
                    required
                    className="w-full px-3 py-1.5 bg-surface border border-hairline rounded text-white placeholder-gray-500 focus:outline-none focus:border-mongo font-sans"
                  />
                </div>
              </div>

              {/* Authentication */}
              <div className="pt-2 border-t border-hairline/60 space-y-3">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-gray-300 font-medium">Authentication</label>
                  <div className="col-span-3">
                    <select
                      value={authMode}
                      onChange={(e) => setAuthMode(e.target.value)}
                      className="w-full px-3 py-1.5 bg-surface border border-hairline rounded text-white focus:outline-none focus:border-mongo font-sans"
                    >
                      <option value="SCRAM-SHA-256">SCRAM-SHA-256</option>
                      <option value="SCRAM-SHA-1">SCRAM-SHA-1</option>
                      <option value="MONGODB-CR">MONGODB-CR</option>
                      <option value="MONGODB-AWS">MONGODB-AWS</option>
                      <option value="X.509">X.509</option>
                      <option value="PLAIN">LDAP</option>
                      <option value="None">None (No Auth)</option>
                    </select>
                  </div>
                </div>

                {authMode !== "None" && authMode !== "X.509" && (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label className="text-gray-300 font-medium">Username</label>
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="mongox or admin"
                          className="w-full px-3 py-1.5 bg-surface border border-hairline rounded font-mono text-white placeholder-gray-500 focus:outline-none focus:border-mongo"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <label className="text-gray-300 font-medium">Password</label>
                      <div className="col-span-3 relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pr-10 px-3 py-1.5 bg-surface border border-hairline rounded font-mono text-white placeholder-gray-500 focus:outline-none focus:border-mongo"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-2 text-gray-400 hover:text-white"
                          title={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <label className="text-gray-300 font-medium">Auth DB</label>
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={authDb}
                          onChange={(e) => setAuthDb(e.target.value)}
                          placeholder="admin"
                          className="w-full px-3 py-1.5 bg-surface border border-hairline rounded font-mono text-white placeholder-gray-500 focus:outline-none focus:border-mongo"
                        />
                      </div>
                    </div>
                  </>
                )}

                {authMode === "X.509" && (
                  <div className="p-3 bg-surface border border-hairline rounded text-gray-400 leading-relaxed">
                    X.509 authentication uses the client certificate configured in the <span className="text-white font-semibold">SSL</span> tab.
                  </div>
                )}
              </div>

              {/* Mark With Color */}
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-gray-300 font-medium">Mark With Color</label>
                <div className="col-span-3">
                  <select
                    value={color}
                    onChange={(e) => setColor(e.target.value as ConnectionColor)}
                    className="w-full px-3 py-1.5 bg-surface border border-hairline rounded text-white focus:outline-none focus:border-mongo font-sans capitalize"
                  >
                    <option value="none">None</option>
                    <option value="red">Red</option>
                    <option value="orange">Orange</option>
                    <option value="yellow">Yellow</option>
                    <option value="green">Green</option>
                    <option value="blue">Blue</option>
                    <option value="purple">Purple</option>
                  </select>
                </div>
              </div>

              {/* Read Only Checkbox */}
              <div className="grid grid-cols-4 items-center gap-4">
                <div />
                <div className="col-span-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={readOnly}
                      onChange={(c) => setReadOnly(c)}
                      label="Make Connection/Database to Read Only"
                    />
                    <span title="Disallows write, update, and drop commands on this connection.">
                      <Info className="w-3.5 h-3.5 text-gray-400 hover:text-white" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Environment Tag */}
              <div className="grid grid-cols-4 items-center gap-4 pt-2 border-t border-hairline/60">
                <label className="text-gray-300 font-medium">Environment</label>
                <div className="col-span-3">
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value as Environment)}
                    className="w-full px-3 py-1.5 bg-surface border border-hairline rounded text-white focus:outline-none focus:border-mongo font-sans capitalize"
                  >
                    <option value="local">Local</option>
                    <option value="development">Development</option>
                    <option value="staging">Staging</option>
                    <option value="production">Production (Guardrails Active)</option>
                  </select>
                </div>
              </div>

              {/* Production Guard Banner */}
              {environment === "production" && (
                <div className="p-3 rounded bg-guard/10 border border-guard/30 flex items-start gap-2.5 text-red-200">
                  <ShieldAlert className="w-4 h-4 text-guard shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">Production Guard Enabled:</span> Destructive actions will require typed interactive confirmation.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SSL */}
          {activeTab === "ssl" && (
            <div className="space-y-4">
              <div>
                <Checkbox
                  checked={useTls}
                  onChange={(c) => setUseTls(c)}
                  label="Use SSL / TLS Encryption"
                  className="font-medium text-gray-200"
                />
              </div>

              {useTls && (
                <div className="space-y-3 pt-2 border-t border-hairline/60">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label className="text-gray-300 font-medium">Protocol</label>
                    <div className="col-span-3">
                      <select
                        value={tlsProtocol}
                        onChange={(e) => setTlsProtocol(e.target.value)}
                        className="w-full px-3 py-1.5 bg-surface border border-hairline rounded text-white focus:outline-none focus:border-mongo font-sans"
                      >
                        <option value="any">Any / Default</option>
                        <option value="tls12">TLS 1.2</option>
                        <option value="tls13">TLS 1.3</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <label className="text-gray-300 font-medium">CA File</label>
                    <div className="col-span-3 flex items-center gap-1.5">
                      <input
                        type="text"
                        value={caFile}
                        onChange={(e) => setCaFile(e.target.value)}
                        placeholder="Path to root CA certificate (.pem, .crt)"
                        className="flex-1 px-3 py-1.5 bg-surface border border-hairline rounded font-mono text-white placeholder-gray-500 focus:outline-none focus:border-mongo"
                      />
                      <FilePickerButton
                        accept=".pem,.crt,.cer"
                        title="Select CA Certificate File"
                        onSelect={(path) => setCaFile(path)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <label className="text-gray-300 font-medium">Client Cert</label>
                    <div className="col-span-3 flex items-center gap-1.5">
                      <input
                        type="text"
                        value={clientCertFile}
                        onChange={(e) => setClientCertFile(e.target.value)}
                        placeholder="Path to client certificate (.pem, .crt)"
                        className="flex-1 px-3 py-1.5 bg-surface border border-hairline rounded font-mono text-white placeholder-gray-500 focus:outline-none focus:border-mongo"
                      />
                      <FilePickerButton
                        accept=".pem,.crt,.cer"
                        title="Select Client Certificate File"
                        onSelect={(path) => setClientCertFile(path)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <label className="text-gray-300 font-medium">Client Key</label>
                    <div className="col-span-3 flex items-center gap-1.5">
                      <input
                        type="text"
                        value={clientKeyFile}
                        onChange={(e) => setClientKeyFile(e.target.value)}
                        placeholder="Path to client key (.key)"
                        className="flex-1 px-3 py-1.5 bg-surface border border-hairline rounded font-mono text-white placeholder-gray-500 focus:outline-none focus:border-mongo"
                      />
                      <FilePickerButton
                        accept=".key,.pem"
                        title="Select Client Key File"
                        onSelect={(path) => setClientKeyFile(path)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <label className="text-gray-300 font-medium">Passphrase</label>
                    <div className="col-span-3">
                      <input
                        type="password"
                        value={keyPassphrase}
                        onChange={(e) => setKeyPassphrase(e.target.value)}
                        placeholder="Key passphrase (if encrypted)"
                        className="w-full px-3 py-1.5 bg-surface border border-hairline rounded font-mono text-white placeholder-gray-500 focus:outline-none focus:border-mongo"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <div />
                    <div className="col-span-3">
                      <Checkbox
                        checked={allowInvalidCerts}
                        onChange={(c) => setAllowInvalidCerts(c)}
                        label="Allow Invalid Hostnames / Certificates (tlsAllowInvalidCertificates)"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SSH */}
          {activeTab === "ssh" && (
            <div className="space-y-4">
              <div>
                <Checkbox
                  checked={useSsh}
                  onChange={(c) => setUseSsh(c)}
                  label="Use SSH Tunnel"
                  className="font-medium text-gray-200"
                />
              </div>

              {useSsh && (
                <div className="space-y-3 pt-2 border-t border-hairline/60">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label className="text-gray-300 font-medium">SSH Host</label>
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={sshHost}
                        onChange={(e) => setSshHost(e.target.value)}
                        placeholder="ssh.example.com"
                        className="w-full px-3 py-1.5 bg-surface border border-hairline rounded font-mono text-white placeholder-gray-500 focus:outline-none focus:border-mongo"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <label className="text-gray-300 font-medium">SSH Port</label>
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={sshPort}
                        onChange={(e) => setSshPort(e.target.value)}
                        placeholder="22"
                        className="w-24 px-3 py-1.5 bg-surface border border-hairline rounded font-mono text-white placeholder-gray-500 focus:outline-none focus:border-mongo"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <label className="text-gray-300 font-medium">Username</label>
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={sshUser}
                        onChange={(e) => setSshUser(e.target.value)}
                        placeholder="ubuntu"
                        className="w-full px-3 py-1.5 bg-surface border border-hairline rounded font-mono text-white placeholder-gray-500 focus:outline-none focus:border-mongo"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <label className="text-gray-300 font-medium">Auth Mode</label>
                    <div className="col-span-3">
                      <select
                        value={sshAuthMode}
                        onChange={(e) => setSshAuthMode(e.target.value as "password" | "key")}
                        className="w-full px-3 py-1.5 bg-surface border border-hairline rounded text-white focus:outline-none focus:border-mongo font-sans"
                      >
                        <option value="password">Password</option>
                        <option value="key">Private Key</option>
                      </select>
                    </div>
                  </div>

                  {sshAuthMode === "password" ? (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label className="text-gray-300 font-medium">SSH Password</label>
                      <div className="col-span-3">
                        <input
                          type="password"
                          value={sshPassword}
                          onChange={(e) => setSshPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-1.5 bg-surface border border-hairline rounded font-mono text-white placeholder-gray-500 focus:outline-none focus:border-mongo"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <label className="text-gray-300 font-medium">Key File</label>
                        <div className="col-span-3 flex items-center gap-1.5">
                          <input
                            type="text"
                            value={sshKeyFile}
                            onChange={(e) => setSshKeyFile(e.target.value)}
                            placeholder="Path to private key (id_rsa, id_ed25519)"
                            className="flex-1 px-3 py-1.5 bg-surface border border-hairline rounded font-mono text-white placeholder-gray-500 focus:outline-none focus:border-mongo"
                          />
                          <FilePickerButton
                            title="Select Private Key File"
                            onSelect={(path) => setSshKeyFile(path)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <label className="text-gray-300 font-medium">Passphrase</label>
                        <div className="col-span-3">
                          <input
                            type="password"
                            value={sshPassphrase}
                            onChange={(e) => setSshPassphrase(e.target.value)}
                            placeholder="Key passphrase"
                            className="w-full px-3 py-1.5 bg-surface border border-hairline rounded font-mono text-white placeholder-gray-500 focus:outline-none focus:border-mongo"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: IN-USE ENCRYPTION */}
          {activeTab === "encryption" && (
            <div className="space-y-4">
              <div>
                <Checkbox
                  checked={useCsfle}
                  onChange={(c) => setUseCsfle(c)}
                  label="Enable Client-Side Field Level Encryption (CSFLE)"
                  className="font-medium text-gray-200"
                />
              </div>

              {useCsfle && (
                <div className="space-y-3 pt-2 border-t border-hairline/60">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label className="text-gray-300 font-medium">KMS Provider</label>
                    <div className="col-span-3">
                      <select
                        value={kmsProvider}
                        onChange={(e) => setKmsProvider(e.target.value)}
                        className="w-full px-3 py-1.5 bg-surface border border-hairline rounded text-white focus:outline-none focus:border-mongo font-sans"
                      >
                        <option value="local">Local Master Key</option>
                        <option value="aws">AWS KMS</option>
                        <option value="azure">Azure Key Vault</option>
                        <option value="gcp">GCP KMS</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <label className="text-gray-300 font-medium">Key Vault</label>
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={keyVaultNamespace}
                        onChange={(e) => setKeyVaultNamespace(e.target.value)}
                        placeholder="encryption.__keyVault"
                        className="w-full px-3 py-1.5 bg-surface border border-hairline rounded font-mono text-white placeholder-gray-500 focus:outline-none focus:border-mongo"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <label className="text-gray-300 font-medium">Master Key</label>
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={kmsMasterKey}
                        onChange={(e) => setKmsMasterKey(e.target.value)}
                        placeholder="Base64 96-byte master key or KMS ARN"
                        className="w-full px-3 py-1.5 bg-surface border border-hairline rounded font-mono text-white placeholder-gray-500 focus:outline-none focus:border-mongo"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: MORE */}
          {activeTab === "more" && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-gray-300 font-medium">Default Database</label>
                <div className="col-span-3">
                  <input
                    type="text"
                    value={defaultDb}
                    onChange={(e) => setDefaultDb(e.target.value)}
                    placeholder="e.g. test_db"
                    className="w-full px-3 py-1.5 bg-surface border border-hairline rounded font-mono text-white placeholder-gray-500 focus:outline-none focus:border-mongo"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-gray-300 font-medium">Connect Timeout</label>
                <div className="col-span-3 flex items-center gap-2">
                  <input
                    type="number"
                    value={connectTimeout}
                    onChange={(e) => setConnectTimeout(Number(e.target.value))}
                    placeholder="30000"
                    className="w-32 px-3 py-1.5 bg-surface border border-hairline rounded font-mono text-white focus:outline-none focus:border-mongo"
                  />
                  <span className="text-gray-500">ms</span>
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-gray-300 font-medium">Socket Timeout</label>
                <div className="col-span-3 flex items-center gap-2">
                  <input
                    type="number"
                    value={socketTimeout}
                    onChange={(e) => setSocketTimeout(Number(e.target.value))}
                    placeholder="30000"
                    className="w-32 px-3 py-1.5 bg-surface border border-hairline rounded font-mono text-white focus:outline-none focus:border-mongo"
                  />
                  <span className="text-gray-500">ms</span>
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-gray-300 font-medium">Read Preference</label>
                <div className="col-span-3">
                  <select
                    value={readPreference}
                    onChange={(e) => setReadPreference(e.target.value)}
                    className="w-full px-3 py-1.5 bg-surface border border-hairline rounded text-white focus:outline-none focus:border-mongo font-sans"
                  >
                    <option value="primary">primary</option>
                    <option value="primaryPreferred">primaryPreferred</option>
                    <option value="secondary">secondary</option>
                    <option value="secondaryPreferred">secondaryPreferred</option>
                    <option value="nearest">nearest</option>
                  </select>
                </div>
              </div>

              {connectionType === "replica_set" && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-gray-300 font-medium">Replica Set Name</label>
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={replicaSetName}
                      onChange={(e) => setReplicaSetName(e.target.value)}
                      placeholder="rs0"
                      className="w-full px-3 py-1.5 bg-surface border border-hairline rounded font-mono text-white placeholder-gray-500 focus:outline-none focus:border-mongo"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Test Connection Banner */}
          {testResult && (
            <div
              className={`p-3 rounded border text-xs flex items-center justify-between ${
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
        </div>

        {/* Modal Action Bar matching NoSQLBooster ergonomics */}
        <div className="px-5 py-3 border-t border-hairline flex items-center justify-between shrink-0 select-none">
          {/* Left: Test Connection */}
          <div>
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting}
              className="px-3 py-1.5 rounded-md bg-surface hover:bg-surface-hover text-xs font-medium text-gray-200 border border-hairline flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${isTesting ? "animate-spin text-mongo" : "text-gray-400"}`} />
              <span>{isTesting ? "Testing..." : "Test Connection"}</span>
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setRawUriInput("");
                setShowFromUriModal(true);
              }}
              className="px-2.5 py-1.5 rounded-md bg-surface hover:bg-surface-hover text-xs font-medium text-gray-300 border border-hairline flex items-center gap-1.5 transition-colors"
              title="Parse raw MongoDB connection string into form fields"
            >
              <FileCode className="w-3.5 h-3.5 text-amber-400" />
              <span>From URI</span>
            </button>

            <button
              type="button"
              onClick={handleCopyToClipboard}
              className="px-2.5 py-1.5 rounded-md bg-surface hover:bg-surface-hover text-xs font-medium text-gray-300 border border-hairline flex items-center gap-1.5 transition-colors"
              title="Generate and copy MongoDB URI to clipboard"
            >
              <Copy className="w-3.5 h-3.5 text-sky-400" />
              <span>To URI</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveInternal(false)}
              disabled={isSaving}
              className="px-3 py-1.5 rounded-md bg-surface hover:bg-surface-hover text-xs font-medium text-gray-200 border border-hairline flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Save</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveInternal(true)}
              disabled={isSaving}
              className="px-3.5 py-1.5 rounded-md bg-mongo hover:bg-emerald-600 text-xs font-semibold text-gray-950 transition-colors shadow-sm disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save & Connect"}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md hover:bg-surface text-xs font-medium text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* From URI Prompt Modal */}
      {showFromUriModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-modal border border-white/10 rounded-xl shadow-modal overflow-hidden flex flex-col font-sans">
            <div className="px-5 py-3.5 border-b border-hairline flex items-center justify-between shrink-0 bg-modal">
              <h3 className="text-sm font-semibold text-white tracking-tight">
                Import from Connection String (URI)
              </h3>
              <button
                onClick={() => setShowFromUriModal(false)}
                aria-label="Close"
                className="p-1.5 rounded-md hover:bg-white/[0.06] text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Paste MongoDB URI:
                </label>
                <textarea
                  value={rawUriInput}
                  onChange={(e) => setRawUriInput(e.target.value)}
                  placeholder="mongodb://username:password@localhost:27017/my_database?authSource=admin"
                  rows={3}
                  autoFocus
                  className="w-full p-3 bg-modal-recessed border border-hairline rounded-md font-mono text-xs text-white placeholder-gray-500 focus:outline-none focus:border-mongo resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowFromUriModal(false)}
                  className="px-3.5 py-1.5 rounded-md hover:bg-white/[0.05] text-xs font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => parseAndPopulateUri(rawUriInput)}
                  disabled={!rawUriInput.trim()}
                  className="px-4 py-1.5 rounded-md bg-mongo hover:bg-emerald-600 text-xs font-semibold text-gray-950 transition-colors shadow-sm disabled:opacity-50"
                >
                  Parse & Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
