import { useState, useEffect, useCallback } from "react";
import { ToolStatus, DownloadProgress } from "../types";
import {
  fetchToolStatuses,
  triggerEnsureToolReady,
  testToolVersion,
} from "../services/tauri";

export function useProvisioning() {
  const [tools, setTools] = useState<ToolStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeDownload, setActiveDownload] = useState<DownloadProgress | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [versionOutputs, setVersionOutputs] = useState<Record<string, string>>({});

  const refreshTools = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchToolStatuses();
      setTools(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTools();
  }, [refreshTools]);

  const ensureTool = async (toolName: string) => {
    try {
      setIsDownloading(true);
      setError(null);
      setActiveDownload({
        bundle: toolName === "mongosh" ? "shell" : "databasetools",
        stage: "downloading",
        downloaded_bytes: 0,
        total_bytes: 0,
        progress_percent: 0,
        speed_bytes_per_sec: 0,
        message: `Initializing JIT acquisition for ${toolName}...`,
      });

      const path = await triggerEnsureToolReady(toolName, (progress) => {
        setActiveDownload(progress);
      });

      await refreshTools();
      return path;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      if (activeDownload) {
        setActiveDownload({
          ...activeDownload,
          stage: "failed",
          message: msg,
        });
      }
      throw err;
    } finally {
      setTimeout(() => {
        setIsDownloading(false);
        setActiveDownload(null);
      }, 1200);
    }
  };

  const checkVersion = async (toolName: string) => {
    try {
      const output = await testToolVersion(toolName);
      setVersionOutputs((prev) => ({ ...prev, [toolName]: output }));
    } catch (err) {
      setVersionOutputs((prev) => ({
        ...prev,
        [toolName]: `Error: ${err instanceof Error ? err.message : String(err)}`,
      }));
    }
  };

  return {
    tools,
    loading,
    isDownloading,
    activeDownload,
    error,
    versionOutputs,
    refreshTools,
    ensureTool,
    checkVersion,
  };
}
