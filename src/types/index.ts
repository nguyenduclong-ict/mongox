export type ToolBundle = "shell" | "databasetools";

export interface ToolStatus {
  name: string;
  bundle: ToolBundle;
  is_available: boolean;
  path: string | null;
  source: string | null; // "local_bin" | "system_path"
}

export interface DownloadProgress {
  bundle: ToolBundle;
  stage: "downloading" | "verifying" | "extracting" | "ready" | "failed";
  downloaded_bytes: number;
  total_bytes: number;
  progress_percent: number;
  speed_bytes_per_sec: number;
  message: string;
}
