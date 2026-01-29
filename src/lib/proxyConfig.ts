/**
 * Proxy Configuration
 * Smart fallback system - tries direct first, falls back to proxy
 */

// Cloudflare Worker proxy URL - public, not secret
const PROXY_URL = 'https://plain-bonus-b3f7.mn3766687.workers.dev';

// The original Supabase URL
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

/**
 * Get the proxy URL
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
 * Check if proxy is configured
 */
export function isUsingProxy(): boolean {
  return !!(PROXY_URL && PROXY_URL.trim());
}

/**
 * For backward compatibility - returns direct URL always
 * The smart fetch handles proxy fallback automatically
 */
export function getEffectiveSupabaseUrl(): string {
  return SUPABASE_URL;
}

/**
 * Test connectivity to both direct and proxy
 */
export async function testConnectivity(): Promise<{
  success: boolean;
  source: 'direct' | 'proxy' | 'none';
  message: string;
  latencyMs?: number;
}> {
  const startTime = Date.now();
  
  // Try direct Supabase first
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        'apikey': SUPABASE_KEY,
      },
    });
    
    if (response.ok) {
      const latencyMs = Date.now() - startTime;
      return {
        success: true,
        source: 'direct',
        message: 'متصل مباشرة بالخادم',
        latencyMs,
      };
    }
  } catch (e) {
    console.warn('Direct connection test failed:', e);
  }
  
  // Try proxy
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
          message: 'متصل عبر البروكسي (الاتصال المباشر محجوب)',
          latencyMs,
        };
      }
    } catch (e) {
      console.warn('Proxy health check failed:', e);
    }
  }
  
  return {
    success: false,
    source: 'none',
    message: 'تعذر الاتصال. جرب VPN أو بيانات الجوال.',
  };
}
