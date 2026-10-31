import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { mongoBridgePlugin } from "./vite-mongo-bridge";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), mongoBridgePlugin()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  envPrefix: ["VITE_", "TAURI_ENV_*"],
});
