/**
 * Smart Backend Proxy Fetch Installer
 * 
 * This module patches the global `window.fetch` to automatically handle
 * Supabase API requests with fallback to proxy when direct connection fails.
 * 
 * Strategy: Try Direct First, Fallback to Proxy
 * 1. Try direct Supabase connection
 * 2. If network error (blocked), retry via Cloudflare Worker proxy
 * 3. If proxy also fails, return the error
 */

// Store the original fetch
const originalFetch = window.fetch;

// Get configuration from environment
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

// Cloudflare Worker proxy URL - public, not secret
const EXTERNAL_PROXY_URL = 'https://plain-bonus-b3f7.mn3766687.workers.dev';

// Flag to track if proxy is installed
let isInstalled = false;

// Track if direct connection is known to be blocked
let directConnectionBlocked = false;

// Paths that should use fallback logic (core Supabase services)
const PROXY_PATHS = ['/auth/', '/rest/', '/storage/', '/graphql/'];

/**
 * Check if a URL is a Supabase request that should use fallback
 */
function isSupabaseRequest(url: string): boolean {
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
    
    // Only handle specific Supabase service paths
    return PROXY_PATHS.some(path => pathname.startsWith(path));
  } catch {
    return false;
  }
}

/**
 * Convert direct Supabase URL to proxy URL
 */
function toProxyUrl(url: string): string {
  try {
    const targetUrl = new URL(url);
    const pathWithQuery = targetUrl.pathname + targetUrl.search;
    const cleanProxyUrl = EXTERNAL_PROXY_URL.replace(/\/$/, '');
    return `${cleanProxyUrl}${pathWithQuery}`;
  } catch {
    return url;
  }
}

/**
 * Check if an error is a network/fetch failure (likely blocked)
 */
function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
    return true;
  }
  return false;
}

/**
 * Smart fetch with automatic fallback
 */
async function smartFetch(
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
    return originalFetch(input, init);
  }
  
  // If not a Supabase request, use original fetch
  if (!isSupabaseRequest(url)) {
    return originalFetch(input, init);
  }
  
  // If we already know direct is blocked, go straight to proxy
  if (directConnectionBlocked) {
    const proxyUrl = toProxyUrl(url);
    if (import.meta.env.DEV) {
      console.log(`[SmartProxy] Using cached proxy route: ${proxyUrl.substring(0, 60)}...`);
    }
    return executeRequest(proxyUrl, input, init);
  }
  
  // Try direct first
  try {
    const response = await executeRequest(url, input, init);
    return response;
  } catch (error) {
    // If network error, try proxy
    if (isNetworkError(error)) {
      console.warn('[SmartProxy] Direct connection failed, trying proxy...');
      directConnectionBlocked = true;
      
      const proxyUrl = toProxyUrl(url);
      if (import.meta.env.DEV) {
        console.log(`[SmartProxy] Fallback to proxy: ${proxyUrl.substring(0, 60)}...`);
      }
      
      try {
        return await executeRequest(proxyUrl, input, init);
      } catch (proxyError) {
        console.error('[SmartProxy] Proxy also failed:', proxyError);
        // Reset blocked flag - maybe it's a temporary issue
        directConnectionBlocked = false;
        throw proxyError;
      }
    }
    
    throw error;
  }
}

/**
 * Execute the actual fetch request
 */
async function executeRequest(
  url: string,
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  // If input was a Request object, we need to clone it with new URL
  if (input instanceof Request) {
    const newRequest = new Request(url, {
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
  
  return originalFetch(url, init);
}

/**
 * Install the smart proxy fetch interceptor
 * Call this BEFORE initializing Supabase client
 */
export function installBackendProxyFetch(): void {
  if (isInstalled) {
    console.warn("[SmartProxy] Already installed, skipping...");
    return;
  }
  
  if (!SUPABASE_URL) {
    console.warn("[SmartProxy] No SUPABASE_URL found, skipping installation");
    return;
  }
  
  // Replace global fetch
  window.fetch = smartFetch;
  isInstalled = true;
  
  console.log("[SmartProxy] ✅ Installed - Direct first, proxy fallback enabled");
}

/**
 * Uninstall the proxy (restore original fetch)
 */
export function uninstallBackendProxyFetch(): void {
  if (!isInstalled) {
    console.warn("[SmartProxy] Not installed, nothing to uninstall");
    return;
  }
  
  window.fetch = originalFetch;
  isInstalled = false;
  directConnectionBlocked = false;
  
  console.log("[SmartProxy] Uninstalled, original fetch restored");
}

/**
 * Check if proxy is currently installed
 */
export function isProxyInstalled(): boolean {
  return isInstalled;
}

/**
 * Force reset the connection state (useful for testing)
 */
export function resetConnectionState(): void {
  directConnectionBlocked = false;
  console.log("[SmartProxy] Connection state reset");
}

/**
 * Check if direct connection is currently blocked
 */
export function isDirectBlocked(): boolean {
  return directConnectionBlocked;
}
