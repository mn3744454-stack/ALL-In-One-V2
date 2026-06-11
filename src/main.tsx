import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Cache cleanup — keep ONLY the push notification service worker (push-sw.js).
// Any other registered worker (including the legacy /sw.js app-shell PWA cache
// that used to stick stale builds to devices) gets unregistered on every load.
(async function cleanupCaches() {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        if (registration.active?.scriptURL?.endsWith('/push-sw.js')) {
          console.log('[CACHE] Keeping push SW:', registration.scope);
          continue;
        }
        await registration.unregister();
        console.log('[CACHE] Unregistered service worker:', registration.scope);
      }
    }
    
    // Delete ALL cache storage entries (push SW doesn't use caches)
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
