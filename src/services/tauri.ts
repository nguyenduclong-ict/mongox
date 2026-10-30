import { ToolStatus, DownloadProgress } from "../types";

// Check if running inside Tauri environment
export const isTauriEnvironment = (): boolean => {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
};

export async function fetchToolStatuses(): Promise<ToolStatus[]> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<ToolStatus[]>("get_tool_statuses");
  }

  // Browser development fallback
  return [
    {
      name: "mongosh",
      bundle: "shell",
      is_available: false,
      path: null,
      source: null,
    },
    {
      name: "mongodump",
      bundle: "databasetools",
      is_available: false,
      path: null,
      source: null,
    },
    {
      name: "mongorestore",
      bundle: "databasetools",
      is_available: false,
      path: null,
      source: null,
    },
    {
      name: "mongoexport",
      bundle: "databasetools",
      is_available: false,
      path: null,
      source: null,
    },
    {
      name: "mongoimport",
      bundle: "databasetools",
      is_available: false,
      path: null,
      source: null,
    },
  ];
}

export async function triggerEnsureToolReady(
  toolName: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<string> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    const { listen } = await import("@tauri-apps/api/event");

    let unlisten: (() => void) | undefined;
    if (onProgress) {
      unlisten = await listen<DownloadProgress>("provisioning://progress", (event) => {
        onProgress(event.payload);
      });
    }

    try {
      return await invoke<string>("ensure_tool_ready", { toolName });
    } finally {
      if (unlisten) {
        unlisten();
      }
    }
  }

  // Browser simulation for UI verification
  if (onProgress) {
    const bundle = toolName === "mongosh" ? "shell" : "databasetools";
    const total = 45 * 1024 * 1024;
    onProgress({
      bundle,
      stage: "downloading",
      downloaded_bytes: total * 0.4,
      total_bytes: total,
      progress_percent: 40.0,
      speed_bytes_per_sec: 5_242_880,
      message: `Downloading ${bundle} archive... (simulated)`,
    });
    await new Promise((r) => setTimeout(r, 600));
    onProgress({
      bundle,
      stage: "verifying",
      downloaded_bytes: total,
      total_bytes: total,
      progress_percent: 100.0,
      speed_bytes_per_sec: 0,
      message: "Verifying SHA-256 cryptographic checksum...",
    });
    await new Promise((r) => setTimeout(r, 400));
    onProgress({
      bundle,
      stage: "ready",
      downloaded_bytes: total,
      total_bytes: total,
      progress_percent: 100.0,
      speed_bytes_per_sec: 0,
      message: "Tool successfully installed and ready.",
    });
  }

  return `C:\\Users\\Mock\\AppData\\Local\\Mongox\\bin\\${toolName}.exe`;
}

export async function testToolVersion(toolName: string): Promise<string> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<string>("test_tool_version", { toolName });
  }

  return `${toolName} version v2.3.8 (Browser Simulation)`;
}
