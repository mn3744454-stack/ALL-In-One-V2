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
    // Kill-switch PWA: ships a self-destroying /sw.js that unregisters any
    // previously-installed app-shell service worker and clears its caches on
    // first load. This evicts the stale Workbox precache that was sticking old
    // builds to devices on preview--*.lovable.app even in Incognito. The push
    // notification worker lives at /push-sw.js and is not affected.
    VitePWA({
      registerType: "autoUpdate",
      selfDestroying: true,
      manifest: false, // reuse existing public/manifest.json
      injectRegister: null,
      devOptions: { enabled: false },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Ensure a single React instance across dependencies
    dedupe: ["react", "react-dom"],
  },
}));
