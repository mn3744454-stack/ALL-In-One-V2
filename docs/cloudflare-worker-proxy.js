/**
 * Cloudflare Worker - Supabase Proxy
 * 
 * This worker proxies all requests to your Supabase project,
 * allowing access even when *.supabase.co is blocked.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://dash.cloudflare.com/
 * 2. Click "Workers & Pages" in the sidebar
 * 3. Click "Create Application" → "Create Worker"
 * 4. Name it something like "supabase-proxy" (you'll get supabase-proxy.<account>.workers.dev)
 * 5. Click "Create Worker"
 * 6. Click "Edit Code" and paste this entire script
 * 7. Go to Settings → Variables → Add Variable:
 *    - Name: SUPABASE_URL
 *    - Value: https://vhxglsvxwwpmoqjabfmj.supabase.co
 * 8. Click "Save and Deploy"
 * 9. Your proxy URL will be: https://supabase-proxy.<your-account>.workers.dev
 * 10. Update your app's .env file: VITE_SUPABASE_PROXY_URL=https://supabase-proxy.<your-account>.workers.dev
 */

// List of allowed origins (Lovable preview domains)
const ALLOWED_ORIGINS = [
  /^https:\/\/.*\.lovable\.app$/,
  /^https:\/\/.*\.lovableproject\.com$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^https:\/\/localhost(:\d+)?$/,
];

// Headers to forward from client to Supabase
const FORWARD_HEADERS = [
  'authorization',
  'apikey',
  'content-type',
  'accept',
  'prefer',
  'x-client-info',
  'x-supabase-api-version',
  'x-supabase-client-platform',
  'x-supabase-client-platform-version',
  'x-supabase-client-runtime',
  'x-supabase-client-runtime-version',
  'range',
  'if-match',
  'if-none-match',
];

// Headers to return from Supabase to client
const RETURN_HEADERS = [
  'content-type',
  'content-range',
  'x-supabase-api-version',
  'etag',
  'cache-control',
];

function isOriginAllowed(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some(pattern => pattern.test(origin));
}

function getCorsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, accept, prefer, x-client-info, x-supabase-api-version, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, range, if-match, if-none-match',
    'Access-Control-Expose-Headers': 'content-type, content-range, x-supabase-api-version, etag',
    'Access-Control-Max-Age': '86400',
  };
  
  // Set allowed origin
  if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else {
    // For non-matching origins, still allow but without credentials
    headers['Access-Control-Allow-Origin'] = '*';
  }
  
  return headers;
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin');
    const corsHeaders = getCorsHeaders(origin);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Health check endpoint
    const url = new URL(request.url);
    if (url.pathname === '/proxy-health') {
      return new Response(JSON.stringify({
        ok: true,
        proxy: 'cloudflare-worker',
        time: new Date().toISOString(),
        target: env.SUPABASE_URL ? 'configured' : 'missing',
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    // Get Supabase URL from environment
    const SUPABASE_URL = env.SUPABASE_URL;
    if (!SUPABASE_URL) {
      return new Response(JSON.stringify({ 
        error: 'SUPABASE_URL not configured in worker environment' 
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    try {
      // Build target URL
      const targetUrl = new URL(url.pathname + url.search, SUPABASE_URL);

      // Build headers for proxied request
      const proxyHeaders = new Headers();
      
      for (const headerName of FORWARD_HEADERS) {
        const value = request.headers.get(headerName);
        if (value) {
          proxyHeaders.set(headerName, value);
        }
      }

      // Get request body for non-GET requests
      let body = null;
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        body = await request.arrayBuffer();
      }

      // Make the proxied request
      const proxyResponse = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: proxyHeaders,
        body: body,
      });

      // Build response headers
      const responseHeaders = new Headers(corsHeaders);
      
      for (const headerName of RETURN_HEADERS) {
        const value = proxyResponse.headers.get(headerName);
        if (value) {
          responseHeaders.set(headerName, value);
        }
      }

      // Return the response as-is (don't parse)
      const responseBody = await proxyResponse.arrayBuffer();
      
      return new Response(responseBody, {
        status: proxyResponse.status,
        statusText: proxyResponse.statusText,
        headers: responseHeaders,
      });

    } catch (error) {
      console.error('Proxy error:', error);
      return new Response(JSON.stringify({ 
        error: 'Proxy request failed',
        message: error.message,
      }), {
        status: 502,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }
  },
};
