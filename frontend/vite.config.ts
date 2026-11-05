import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export function getViteBase(): string {
  const mode = process.env.NODE_ENV || "development";
  const env = loadEnv(mode, process.cwd(), "");
  const rawBase =
    process.env.VITE_BASE_PATH ||
    env.VITE_BASE_PATH ||
    process.env.VITE_ROUTER_BASE ||
    env.VITE_ROUTER_BASE ||
    process.env.BASE_PATH ||
    env.BASE_PATH ||
    "/";

  const trimmed = rawBase.trim();
  if (!trimmed || trimmed === "/" || trimmed === "." || trimmed === "./") {
    return "/";
  }

  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
}

// https://vitejs.dev/config/
export default defineConfig({
  base: getViteBase(),
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:9090",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
