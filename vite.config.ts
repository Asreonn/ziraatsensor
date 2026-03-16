import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const githubPagesBase = "/pond-peek-studio/";

export default defineConfig(({ mode }) => ({
  base: mode === "production" ? githubPagesBase : "/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
