const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    // Extract the path after /backend-proxy/
    // The path will be like: /backend-proxy/auth/v1/token or /backend-proxy/rest/v1/profiles
    const pathMatch = url.pathname.match(/\/backend-proxy\/(.*)/);
    
    if (!pathMatch || !pathMatch[1]) {
      return new Response(
        JSON.stringify({ error: "Invalid proxy path" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const targetPath = pathMatch[1];

    // Health check endpoint for diagnostics
    if (targetPath === "health") {
      return new Response(
        JSON.stringify({ 
          ok: true, 
          time: new Date().toISOString(), 
          version: "1.0.0",
          message: "Backend proxy is operational"
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Build target URL
    const targetUrl = new URL(`${supabaseUrl}/${targetPath}`);
    // Preserve query parameters
    url.searchParams.forEach((value, key) => {
      targetUrl.searchParams.set(key, value);
    });

    // Prepare headers for the proxied request
    const proxyHeaders = new Headers();
    
    // Copy relevant headers from original request
    const headersToForward = [
      "authorization",
      "content-type",
      "accept",
      "prefer",
      "x-client-info",
    ];
    
    for (const headerName of headersToForward) {
      const value = req.headers.get(headerName);
      if (value) {
        proxyHeaders.set(headerName, value);
      }
    }
    
    // Always set apikey header with anon key
    proxyHeaders.set("apikey", supabaseAnonKey);
    
    // If no authorization header provided, use anon key as bearer
    if (!proxyHeaders.has("authorization")) {
      proxyHeaders.set("authorization", `Bearer ${supabaseAnonKey}`);
    }

    // Get request body if present
    let body: BodyInit | null = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
      body = await req.text();
    }

    console.log(`Proxying ${req.method} request to: ${targetUrl.toString()}`);

    // Make the proxied request
    const proxyResponse = await fetch(targetUrl.toString(), {
      method: req.method,
      headers: proxyHeaders,
      body: body,
    });

    // Get response body
    const responseBody = await proxyResponse.text();

    // Build response headers
    const responseHeaders = new Headers(corsHeaders);
    
    // Forward content-type from response
    const contentType = proxyResponse.headers.get("content-type");
    if (contentType) {
      responseHeaders.set("content-type", contentType);
    }
    
    // Forward other important headers
    const headersToReturn = [
      "x-supabase-user-id",
      "x-supabase-role",
      "sb-gateway-version",
    ];
    
    for (const headerName of headersToReturn) {
      const value = proxyResponse.headers.get(headerName);
      if (value) {
        responseHeaders.set(headerName, value);
      }
    }

    return new Response(responseBody, {
      status: proxyResponse.status,
      statusText: proxyResponse.statusText,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Proxy request failed", 
        message: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 502, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
