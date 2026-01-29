/**
 * Proxy Configuration
 * 
 * This module handles the proxy URL configuration for bypassing network blocks.
 * 
 * When a Cloudflare Worker proxy is configured via VITE_SUPABASE_PROXY_URL,
 * all Supabase requests will be routed through it instead of directly to supabase.co.
 */

// Get the configured proxy URL (if any)
const PROXY_URL = import.meta.env.VITE_SUPABASE_PROXY_URL as string | undefined;

// The original Supabase URL
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

/**
 * Get the effective Supabase URL to use.
 * Returns the proxy URL if configured, otherwise the direct Supabase URL.
 */
export function getEffectiveSupabaseUrl(): string {
  if (PROXY_URL && PROXY_URL.trim()) {
    return PROXY_URL.trim().replace(/\/$/, ''); // Remove trailing slash
  }
  return SUPABASE_URL;
}

/**
 * Check if we're using a proxy
 */
export function isUsingProxy(): boolean {
  return !!(PROXY_URL && PROXY_URL.trim());
}

/**
 * Get the proxy URL (or null if not configured)
 */
export function getProxyUrl(): string | null {
  if (PROXY_URL && PROXY_URL.trim()) {
    return PROXY_URL.trim().replace(/\/$/, '');
  }
  return null;
}

/**
 * Get the original Supabase URL
 */
export function getOriginalSupabaseUrl(): string {
  return SUPABASE_URL;
}

/**
 * Test connectivity to the proxy or direct Supabase
 */
export async function testConnectivity(): Promise<{
  success: boolean;
  source: 'proxy' | 'direct' | 'none';
  message: string;
  latencyMs?: number;
}> {
  const startTime = Date.now();
  
  // First try proxy if configured
  if (PROXY_URL && PROXY_URL.trim()) {
    try {
      const proxyUrl = PROXY_URL.trim().replace(/\/$/, '');
      const response = await fetch(`${proxyUrl}/proxy-health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      
      if (response.ok) {
        const latencyMs = Date.now() - startTime;
        return {
          success: true,
          source: 'proxy',
          message: 'متصل عبر البروكسي',
          latencyMs,
        };
      }
    } catch (e) {
      console.warn('Proxy health check failed:', e);
    }
  }
  
  // Try direct Supabase
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    });
    
    if (response.ok) {
      const latencyMs = Date.now() - startTime;
      return {
        success: true,
        source: 'direct',
        message: 'متصل مباشرة',
        latencyMs,
      };
    }
  } catch (e) {
    console.warn('Direct Supabase health check failed:', e);
  }
  
  return {
    success: false,
    source: 'none',
    message: 'تعذر الاتصال. شبكتك قد تحجب الخادم.',
  };
}
