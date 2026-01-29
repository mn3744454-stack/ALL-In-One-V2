import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Aggressive cache cleanup to prevent stale builds
// This runs on EVERY app start to ensure fresh code
(async function cleanupCaches() {
  try {
    // Unregister ALL service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('[CACHE] Unregistered service worker:', registration.scope);
      }
    }
    
    // Delete ALL cache storage entries
    if ('caches' in window) {
      const names = await caches.keys();
      for (const name of names) {
        await caches.delete(name);
        console.log('[CACHE] Deleted cache:', name);
      }
    }
    
    console.log('[CACHE] Cleanup complete');
  } catch (err) {
    console.error('[CACHE] Cleanup error:', err);
  }
})();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
