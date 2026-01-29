import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installBackendProxyFetch } from "./lib/installBackendProxyFetch";

// Install backend proxy BEFORE anything else
// This ensures all Supabase requests go through our proxy to avoid network blocks
installBackendProxyFetch();

// Clear stale service worker caches to prevent React version mismatches
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
  caches.keys().then((names) => {
    names.forEach((name) => caches.delete(name));
  });
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
