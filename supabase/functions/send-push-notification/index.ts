import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-push-secret",
};

// Category mapping: event_type -> preference column
function getPreferenceColumn(
  eventType: string
): string | null {
  if (eventType === "lab_request.message_added") return "push_messages";
  if (eventType === "lab_request.result_published") return "push_results";
  if (
    eventType === "lab_request.new" ||
    eventType === "lab_request.status_changed"
  )
    return "push_status";
  if (eventType.startsWith("invitation.")) return "push_invitations";
  if (eventType.startsWith("connection.")) return "push_partnerships";
  return null; // unknown category — send by default
}

function isInQuietHours(
  quietStart: string | null,
  quietEnd: string | null,
  quietTimezone: string
): boolean {
  if (!quietStart || !quietEnd) return false;

  try {
    const now = new Date();
    // Get current time in user's timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: quietTimezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hour = parseInt(
      parts.find((p) => p.type === "hour")?.value || "0",
      10
    );
    const minute = parseInt(
      parts.find((p) => p.type === "minute")?.value || "0",
      10
    );
    const currentMinutes = hour * 60 + minute;

    const [startH, startM] = quietStart.split(":").map(Number);
    const [endH, endM] = quietEnd.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
      // Same day: e.g. 09:00 - 17:00
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Overnight: e.g. 22:00 - 07:00
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  } catch {
    return false;
  }
}

// Build route URL from notification data (mirrors client getNotificationRoute)
function getNotificationRoute(eventType: string, entityId: string | null): string {
  if (eventType.startsWith("connection.")) {
    return "/dashboard/laboratory?tab=requests";
  }
  if (eventType === "lab_request.message_added" && entityId) {
    return `/dashboard/laboratory?tab=requests&requestId=${entityId}&openThread=true`;
  }
  if (eventType.startsWith("lab_request.") && entityId) {
    return `/dashboard/laboratory?tab=requests&requestId=${entityId}`;
  }
  return "/dashboard/laboratory?tab=requests";
}

// Minimal web-push implementation using Web Push Protocol
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<Response> {
  // For web push we need crypto operations. Use a simpler approach:
  // Send via the endpoint with proper VAPID headers.
  // Since Deno doesn't have the web-push npm lib, we'll use a raw fetch
  // with the subscription endpoint and rely on the push service accepting
  // unsigned payloads for development, then upgrade to full VAPID later.

  // Import web-push compatible library for Deno
  const webPush = await import("https://esm.sh/web-push@3.6.7");

  webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  // web-push returns a promise that resolves with the response
  const result = await webPush.sendNotification(pushSubscription, payload);
  return new Response(null, { status: result.statusCode });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate shared secret
    const pushSecret = req.headers.get("x-push-secret");
    const expectedSecret = Deno.env.get("PUSH_EDGE_SECRET");

    if (!expectedSecret || pushSecret !== expectedSecret) {
      console.error("[push] Invalid or missing x-push-secret");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notification = await req.json();
    const { id, user_id, event_type, title, body, entity_id } = notification;

    if (!user_id || !event_type) {
      return new Response(
        JSON.stringify({ error: "Missing user_id or event_type" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      `[push] Processing notification ${id} for user ${user_id}, type: ${event_type}`
    );

    // Create admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Check user preferences
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    // If no preferences row, defaults are all true / no quiet hours
    const prefColumn = getPreferenceColumn(event_type);
    if (prefs && prefColumn && prefs[prefColumn] === false) {
      console.log(`[push] Category ${prefColumn} disabled for user ${user_id}`);
      return new Response(
        JSON.stringify({ skipped: true, reason: "category_disabled" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Check quiet hours
    if (prefs) {
      const inQuiet = isInQuietHours(
        prefs.quiet_start,
        prefs.quiet_end,
        prefs.quiet_timezone || "Asia/Riyadh"
      );
      if (inQuiet) {
        console.log(`[push] Quiet hours active for user ${user_id}`);
        return new Response(
          JSON.stringify({ skipped: true, reason: "quiet_hours" }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // 3. Get active subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", user_id)
      .eq("is_active", true);

    if (subError) {
      console.error("[push] Error fetching subscriptions:", subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`[push] No active subscriptions for user ${user_id}`);
      return new Response(
        JSON.stringify({ sent: 0, reason: "no_subscriptions" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Build push payload
    const url = getNotificationRoute(event_type, entity_id);
    const pushPayload = JSON.stringify({
      title: title || "Khail",
      body: body || "",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      data: {
        url,
        notificationId: id,
      },
    });

    // 5. Send to all active subscriptions
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:support@khail.app";

    let sent = 0;
    let failed = 0;
    const deactivated: string[] = [];

    for (const sub of subscriptions) {
      try {
        const response = await sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          pushPayload,
          vapidPublicKey,
          vapidPrivateKey,
          vapidSubject
        );

        if (response.status === 410 || response.status === 404) {
          // Endpoint gone — deactivate
          await supabase
            .from("push_subscriptions")
            .update({ is_active: false })
            .eq("id", sub.id);
          deactivated.push(sub.id);
          console.log(`[push] Deactivated expired subscription ${sub.id}`);
        } else if (response.status >= 200 && response.status < 300) {
          sent++;
        } else {
          failed++;
          console.error(
            `[push] Failed to send to ${sub.id}: status ${response.status}`
          );
        }
      } catch (err) {
        failed++;
        console.error(`[push] Error sending to ${sub.id}:`, err);
        // If the error indicates the subscription is invalid, deactivate it
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await supabase
            .from("push_subscriptions")
            .update({ is_active: false })
            .eq("id", sub.id);
          deactivated.push(sub.id);
        }
      }
    }

    console.log(
      `[push] Done: sent=${sent}, failed=${failed}, deactivated=${deactivated.length}`
    );

    return new Response(
      JSON.stringify({ sent, failed, deactivated: deactivated.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[push] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
