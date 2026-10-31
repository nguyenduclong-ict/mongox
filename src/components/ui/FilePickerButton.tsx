import React, { useRef } from "react";
import { FolderOpen } from "lucide-react";
import { isTauriEnvironment } from "../../services/tauri";

export interface FilePickerButtonProps {
  onSelect: (path: string) => void;
  directory?: boolean;
  accept?: string;
  title?: string;
  className?: string;
}

export const FilePickerButton: React.FC<FilePickerButtonProps> = ({
  onSelect,
  directory = false,
  accept,
  title = directory ? "Choose Folder" : "Choose File",
  className = "",
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = async () => {
    if (isTauriEnvironment()) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const res = await invoke<string | null>("select_path_dialog", { directory });
        if (res) {
          onSelect(res);
          return;
        }
      } catch (err) {
        console.error("Native dialog error:", err);
      }
    }

    // Modern browser directory picker (does not say "upload")
    if (directory && typeof (window as any).showDirectoryPicker === "function") {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        if (dirHandle && dirHandle.name) {
          onSelect(`./${dirHandle.name}`);
          return;
        }
      } catch (e: any) {
        if (e.name === "AbortError") return;
      }
    }

    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      // On web, path property or name
      const fullPath = (file as any).path || file.name;
      onSelect(fullPath);
    }
    // Reset so same file can be selected again
    e.target.value = "";
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title={title}
        className={`p-1.5 rounded bg-surface hover:bg-surface-hover text-gray-300 hover:text-white border border-hairline flex items-center justify-center transition-colors shrink-0 ${className}`}
      >
        <FolderOpen className="w-3.5 h-3.5 text-mongo" />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        {...(directory ? { webkitdirectory: "", directory: "" } : {})}
      />
    </>
  );
};
