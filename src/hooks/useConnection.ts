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

export function useConnection() {
  const [connections, setConnections] = useState<ConnectionProfile[]>([]);
  const [activeConnection, setActiveConnection] = useState<ConnectionProfile | null>(null);
  const [hierarchy, setHierarchy] = useState<DatabaseInfo[]>([]);
  const [selectedDb, setSelectedDb] = useState<string | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [pingResult, setPingResult] = useState<PingResult | null>(null);
  const [isTestingPing, setIsTestingPing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadConnections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await listConnections();
      setConnections(list);
      if (list.length > 0 && !activeConnection) {
        setActiveConnection(list[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [activeConnection]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  // Load hierarchy whenever active connection changes
  useEffect(() => {
    if (activeConnection) {
      getConnectionHierarchy(activeConnection.id)
        .then((data) => {
          setHierarchy(data);
          if (data.length > 0) {
            setSelectedDb(data[0].name);
            if (data[0].collections.length > 0) {
              setSelectedCollection(data[0].collections[0].name);
            } else {
              setSelectedCollection(null);
            }
          }
        })
        .catch((err) => {
          console.error("Failed to load hierarchy:", err);
          setHierarchy([]);
        });
    } else {
      setHierarchy([]);
      setSelectedDb(null);
      setSelectedCollection(null);
    }
  }, [activeConnection]);

  const selectConnection = (conn: ConnectionProfile) => {
    setActiveConnection(conn);
    setPingResult(null);
  };

  const saveProfile = async (profile: ConnectionProfile, autoConnect: boolean = true) => {
    const saved = await saveConnection(profile);
    await loadConnections();
    if (autoConnect || !activeConnection || activeConnection.id === saved.id) {
      setActiveConnection(saved);
    }
    return saved;
  };

  const removeProfile = async (id: string) => {
    await deleteConnection(id);
    await loadConnections();
    if (activeConnection?.id === id) {
      setActiveConnection(null);
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
