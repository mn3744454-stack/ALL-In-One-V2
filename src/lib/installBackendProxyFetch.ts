/**
 * Backend Proxy Fetch Installer
 * 
 * This module patches the global `window.fetch` to automatically route
 * Supabase API requests through our proxy, bypassing any network
 * blocks that might prevent direct browser-to-Supabase connections.
 * 
 * Priority:
 * 1. If VITE_SUPABASE_PROXY_URL is set (Cloudflare Worker), use that
 * 2. Otherwise, use the Edge Function backend-proxy (same domain, less effective)
 * 
 * How it works:
 * - Intercepts all fetch calls
 * - If the URL targets Supabase auth/rest/storage paths, rewrites to go through proxy
 * - Edge functions (/functions/v1/) are NOT proxied to avoid circular calls
 */

// Store the original fetch
const originalFetch = window.fetch;

// Get configuration from environment
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const EXTERNAL_PROXY_URL = import.meta.env.VITE_SUPABASE_PROXY_URL as string | undefined;

// Flag to track if proxy is installed
let isInstalled = false;

// Paths that should be proxied (core Supabase services)
const PROXY_PATHS = ['/auth/', '/rest/', '/storage/', '/graphql/'];

/**
 * Check if a URL should be proxied
 */
function shouldProxy(url: string): boolean {
  if (!SUPABASE_URL) return false;
  
  try {
    const targetUrl = new URL(url);
    const supabaseUrl = new URL(SUPABASE_URL);
    
    // Must be same origin as Supabase project
    if (targetUrl.origin !== supabaseUrl.origin) {
      return false;
    }
    
    const pathname = targetUrl.pathname;
    
    // Never proxy edge functions (prevents circular calls)
    if (pathname.startsWith('/functions/v1/')) {
      return false;
    }
    
    // Only proxy specific Supabase service paths
    return PROXY_PATHS.some(path => pathname.startsWith(path));
  } catch {
    return false;
  }
}

/**
 * Rewrite a Supabase URL to go through the proxy
 * Priority:
 * 1. External proxy (Cloudflare Worker) if VITE_SUPABASE_PROXY_URL is set
 * 2. Edge Function backend-proxy as fallback
 */
function rewriteUrl(url: string): string {
  if (!SUPABASE_URL) return url;
  
  try {
    const targetUrl = new URL(url);
    
    // Get the path after the origin (e.g., /auth/v1/token?grant_type=password)
    const pathWithQuery = targetUrl.pathname + targetUrl.search;
    
    let proxyUrl: string;
    
    // Priority 1: Use external proxy (Cloudflare Worker) if configured
    if (EXTERNAL_PROXY_URL && EXTERNAL_PROXY_URL.trim()) {
      const cleanProxyUrl = EXTERNAL_PROXY_URL.trim().replace(/\/$/, '');
      proxyUrl = `${cleanProxyUrl}${pathWithQuery}`;
      
      if (import.meta.env.DEV) {
        console.log(`[ExternalProxy] Rewriting: ${url.substring(0, 60)}...`);
        console.log(`[ExternalProxy] To: ${proxyUrl.substring(0, 60)}...`);
      }
    } else {
      // Priority 2: Use Edge Function backend-proxy (same domain - less effective for blocks)
      proxyUrl = `${SUPABASE_URL}/functions/v1/backend-proxy${pathWithQuery}`;
      
      if (import.meta.env.DEV) {
        console.log(`[BackendProxy] Rewriting: ${url.substring(0, 60)}...`);
        console.log(`[BackendProxy] To: ${proxyUrl.substring(0, 60)}...`);
      }
    }
    
    return proxyUrl;
  } catch (e) {
    console.error("[Proxy] Failed to rewrite URL:", e);
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
    console.warn("[Proxy] Already installed, skipping...");
    return;
  }
  
  if (!SUPABASE_URL) {
    console.warn("[Proxy] No SUPABASE_URL found, skipping proxy installation");
    return;
  }
  
  // Replace global fetch
  window.fetch = proxiedFetch;
  isInstalled = true;
  
  if (EXTERNAL_PROXY_URL && EXTERNAL_PROXY_URL.trim()) {
    console.log("[Proxy] ✅ Installed with EXTERNAL proxy (Cloudflare Worker)");
    console.log(`[Proxy] Routing via: ${EXTERNAL_PROXY_URL}`);
  } else {
    console.log("[Proxy] ✅ Installed with Edge Function proxy");
    console.log(`[Proxy] Routing via: ${SUPABASE_URL}/functions/v1/backend-proxy`);
  }
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
