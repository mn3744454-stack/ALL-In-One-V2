/**
 * Backend Proxy Fetch Installer
 * 
 * This module patches the global `window.fetch` to automatically route
 * Supabase API requests through our backend proxy, bypassing any network
 * blocks that might prevent direct browser-to-Supabase connections.
 * 
 * How it works:
 * - Intercepts all fetch calls
 * - If the URL targets the Supabase domain, rewrites it to go through /functions/v1/backend-proxy/
 * - The backend proxy then forwards the request server-side
 */

// Store the original fetch
const originalFetch = window.fetch;

// Get Supabase URL from environment
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

// Flag to track if proxy is installed
let isInstalled = false;

/**
 * Check if a URL should be proxied
 */
function shouldProxy(url: string): boolean {
  if (!SUPABASE_URL) return false;
  
  try {
    const targetUrl = new URL(url);
    const supabaseUrl = new URL(SUPABASE_URL);
    
    // Proxy if the request is going to our Supabase project
    return targetUrl.origin === supabaseUrl.origin;
  } catch {
    return false;
  }
}

/**
 * Rewrite a Supabase URL to go through the proxy
 */
function rewriteUrl(url: string): string {
  if (!SUPABASE_URL) return url;
  
  try {
    const targetUrl = new URL(url);
    const supabaseUrl = new URL(SUPABASE_URL);
    
    // Get the path after the origin (e.g., /auth/v1/token?grant_type=password)
    const pathWithQuery = targetUrl.pathname + targetUrl.search;
    
    // Construct the proxy URL using current origin
    const proxyUrl = `${window.location.origin}/functions/v1/backend-proxy${pathWithQuery}`;
    
    if (import.meta.env.DEV) {
      console.log(`[BackendProxy] Rewriting: ${url.substring(0, 80)}...`);
      console.log(`[BackendProxy] To: ${proxyUrl.substring(0, 80)}...`);
    }
    
    return proxyUrl;
  } catch (e) {
    console.error("[BackendProxy] Failed to rewrite URL:", e);
    return url;
  }
}

/**
 * Proxied fetch function
 */
async function proxiedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  let url: string;
  
  // Extract URL from input
  if (typeof input === "string") {
    url = input;
  } else if (input instanceof URL) {
    url = input.toString();
  } else if (input instanceof Request) {
    url = input.url;
  } else {
    // Fallback - shouldn't happen but just in case
    return originalFetch(input, init);
  }
  
  // Check if we should proxy this request
  if (shouldProxy(url)) {
    const proxiedUrl = rewriteUrl(url);
    
    // If input was a Request object, we need to create a new one with the new URL
    if (input instanceof Request) {
      const newRequest = new Request(proxiedUrl, {
        method: input.method,
        headers: input.headers,
        body: input.body,
        mode: input.mode,
        credentials: input.credentials,
        cache: input.cache,
        redirect: input.redirect,
        referrer: input.referrer,
        integrity: input.integrity,
      });
      return originalFetch(newRequest, init);
    }
    
    // Otherwise just use the new URL
    return originalFetch(proxiedUrl, init);
  }
  
  // Not a Supabase request, use original fetch
  return originalFetch(input, init);
}

/**
 * Install the backend proxy fetch interceptor
 * Call this BEFORE initializing Supabase client or any other code that makes fetch calls
 */
export function installBackendProxyFetch(): void {
  if (isInstalled) {
    console.warn("[BackendProxy] Already installed, skipping...");
    return;
  }
  
  if (!SUPABASE_URL) {
    console.warn("[BackendProxy] No SUPABASE_URL found, skipping proxy installation");
    return;
  }
  
  // Replace global fetch
  window.fetch = proxiedFetch;
  isInstalled = true;
  
  console.log("[BackendProxy] ✅ Installed successfully");
  console.log(`[BackendProxy] Proxying requests to: ${SUPABASE_URL}`);
}

/**
 * Uninstall the proxy (restore original fetch)
 * Useful for testing or if you need to disable the proxy
 */
export function uninstallBackendProxyFetch(): void {
  if (!isInstalled) {
    console.warn("[BackendProxy] Not installed, nothing to uninstall");
    return;
  }
  
  window.fetch = originalFetch;
  isInstalled = false;
  
  console.log("[BackendProxy] Uninstalled, original fetch restored");
}

/**
 * Check if proxy is currently installed
 */
export function isProxyInstalled(): boolean {
  return isInstalled;
}
