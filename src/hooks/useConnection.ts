import { useState, useEffect, useCallback } from "react";
import {
  ConnectionProfile,
  DatabaseInfo,
  PingResult,
} from "../types";
import {
  listConnections,
  saveConnection,
  deleteConnection,
  testConnection,
  getConnectionHierarchy,
} from "../services/tauri";

const LAST_ACTIVE_CONN_KEY = "mongox_last_active_connection_id";

export function useConnection() {
  const [connections, setConnections] = useState<ConnectionProfile[]>([]);
  const [activeConnection, setActiveConnection] = useState<ConnectionProfile | null>(null);
  const [connectingConnId, setConnectingConnId] = useState<string | null>(null);
  const [hierarchy, setHierarchy] = useState<DatabaseInfo[]>([]);
  const [selectedDb, setSelectedDb] = useState<string | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [pingResult, setPingResult] = useState<PingResult | null>(null);
  const [isTestingPing, setIsTestingPing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const connectConnection = useCallback(async (conn: ConnectionProfile) => {
    setConnectingConnId(conn.id);
    setError(null);
    setPingResult(null);
    try {
      const data = await getConnectionHierarchy(conn.id);
      setHierarchy(data);
      setActiveConnection(conn);
      try {
        localStorage.setItem(LAST_ACTIVE_CONN_KEY, conn.id);
      } catch (e) {
        // ignore localStorage errors
      }
      if (data.length > 0) {
        setSelectedDb(data[0].name);
        if (data[0].collections.length > 0) {
          setSelectedCollection(data[0].collections[0].name);
        } else {
          setSelectedCollection(null);
        }
      } else {
        setSelectedDb(null);
        setSelectedCollection(null);
      }
      return data;
    } catch (err) {
      console.error("Failed to connect:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      setHierarchy([]);
      setActiveConnection(null);
      setSelectedDb(null);
      setSelectedCollection(null);
      throw err;
    } finally {
      setConnectingConnId(null);
    }
  }, []);

  const disconnectConnection = useCallback((connId?: string) => {
    if (!connId || activeConnection?.id === connId) {
      setActiveConnection(null);
      setHierarchy([]);
      setSelectedDb(null);
      setSelectedCollection(null);
      setPingResult(null);
      setConnectingConnId(null);
      try {
        localStorage.removeItem(LAST_ACTIVE_CONN_KEY);
      } catch (e) {
        // ignore
      }
    }
  }, [activeConnection]);

  const loadConnections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await listConnections();
      setConnections(list);

      // Auto-reconnect to the connection that was open in the previous session
      try {
        const lastActiveId = localStorage.getItem(LAST_ACTIVE_CONN_KEY);
        if (lastActiveId) {
          const matched = list.find((c) => c.id === lastActiveId);
          if (matched) {
            connectConnection(matched).catch((err) => {
              console.warn("Auto-reconnect failed for previous connection:", err);
            });
          }
        }
      } catch (e) {
        // ignore
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [connectConnection]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const selectConnection = useCallback(async (conn: ConnectionProfile) => {
    if (activeConnection?.id === conn.id && !connectingConnId) {
      return;
    }
    return await connectConnection(conn);
  }, [activeConnection, connectingConnId, connectConnection]);

  const saveProfile = async (profile: ConnectionProfile, autoConnect: boolean = true) => {
    const saved = await saveConnection(profile);
    await loadConnections();
    if (autoConnect) {
      await connectConnection(saved);
    }
    return saved;
  };

  const removeProfile = async (id: string) => {
    await deleteConnection(id);
    try {
      if (localStorage.getItem(LAST_ACTIVE_CONN_KEY) === id) {
        localStorage.removeItem(LAST_ACTIVE_CONN_KEY);
      }
    } catch (e) {
      // ignore
    }
    await loadConnections();
    if (activeConnection?.id === id) {
      disconnectConnection(id);
    }
  };

  const testPing = async (uri: string) => {
    setIsTestingPing(true);
    try {
      const res = await testConnection(uri);
      setPingResult(res);
      return res;
    } finally {
      setIsTestingPing(false);
    }
  };

  return {
    connections,
    activeConnection,
    connectingConnId,
    hierarchy,
    selectedDb,
    selectedCollection,
    pingResult,
    isTestingPing,
    loading,
    error,
    setSelectedDb,
    setSelectedCollection,
    selectConnection,
    connectConnection,
    disconnectConnection,
    saveProfile,
    removeProfile,
    testPing,
    reloadHierarchy: async () => {
      if (activeConnection) {
        const dbs = await getConnectionHierarchy(activeConnection.id);
        setHierarchy(dbs);
        return dbs;
      }
      return [];
    },
  };
}
