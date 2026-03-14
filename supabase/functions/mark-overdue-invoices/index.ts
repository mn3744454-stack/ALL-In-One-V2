import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Mark invoices as overdue where:
    // - status is approved, shared, or partial (financially active but unpaid)
    // - due_date exists and is in the past
    const { data, error } = await supabase
      .from("invoices")
      .update({ status: "overdue" })
      .in("status", ["approved", "shared", "partial"])
      .not("due_date", "is", null)
      .lt("due_date", new Date().toISOString().split("T")[0])
      .select("id, invoice_number, status");

    if (error) {
      console.error("Error marking overdue:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const count = data?.length ?? 0;
    console.log(`Marked ${count} invoices as overdue`);

    return new Response(
      JSON.stringify({ success: true, updated: count, invoices: data }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
