import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // PWA TEMPORARILY DISABLED to diagnose caching issues
    // VitePWA({
    //   registerType: "autoUpdate",
    //   ...
    // }),
    // Uncomment above when cache issues are resolved
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Ensure a single React instance across dependencies
    dedupe: ["react", "react-dom"],
  },
}));
