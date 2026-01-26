import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.info(JSON.stringify({
    event: "expire_stale_connections_start",
    requestId,
    timestamp: new Date().toISOString(),
  }));

  try {
    // Create Supabase client with service role for privileged access
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call the expire_stale_connections RPC
    const { data, error } = await supabase.rpc("expire_stale_connections");

    if (error) {
      const durationMs = Date.now() - startTime;
      console.error(JSON.stringify({
        event: "expire_stale_connections_error",
        requestId,
        error: error.message,
        duration_ms: durationMs,
        timestamp: new Date().toISOString(),
      }));
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          duration_ms: durationMs,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const durationMs = Date.now() - startTime;
    console.info(JSON.stringify({
      event: "expire_stale_connections_done",
      requestId,
      expired_count: data,
      duration_ms: durationMs,
      timestamp: new Date().toISOString(),
    }));

    return new Response(
      JSON.stringify({
        success: true,
        expired_count: data,
        duration_ms: durationMs,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(JSON.stringify({
      event: "expire_stale_connections_failure",
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
      duration_ms: durationMs,
      timestamp: new Date().toISOString(),
    }));
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        duration_ms: durationMs,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
