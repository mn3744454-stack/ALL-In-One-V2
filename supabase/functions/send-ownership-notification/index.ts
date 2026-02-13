import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Validation helpers ──────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECIPIENTS = 5;

const ALLOWED_EVENT_TYPES = [
  "added",
  "removed",
  "updated",
  "transferred_in",
  "transferred_out",
];

interface ValidatedPayload {
  tenant_id: string;
  horse_id: string;
  event_type: string;
  recipients: string[];
  // pass-through optional fields
  horse_name?: string;
  owner_name?: string;
  sender_name?: string;
  receiver_name?: string;
  percentage?: number;
  from_owner_name?: string;
  to_owner_name?: string;
  notes?: string;
}

function validatePayload(body: unknown): { ok: true; data: ValidatedPayload } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object" };
  }

  const b = body as Record<string, unknown>;

  // Required UUIDs
  if (typeof b.tenant_id !== "string" || !UUID_RE.test(b.tenant_id)) {
    return { ok: false, error: "tenant_id is required and must be a valid UUID" };
  }
  if (typeof b.horse_id !== "string" || !UUID_RE.test(b.horse_id)) {
    return { ok: false, error: "horse_id is required and must be a valid UUID" };
  }

  // event_type
  const eventType = b.event_type ?? b.action;
  if (typeof eventType !== "string" || !ALLOWED_EVENT_TYPES.includes(eventType)) {
    return { ok: false, error: `event_type must be one of: ${ALLOWED_EVENT_TYPES.join(", ")}` };
  }

  // Recipients: accept recipient_email (string) OR recipients (string[])
  let recipients: string[] = [];
  if (typeof b.recipient_email === "string") {
    recipients = [b.recipient_email];
  } else if (typeof b.owner_email === "string") {
    // backward compat with old payload shape
    recipients = [b.owner_email];
  } else if (Array.isArray(b.recipients)) {
    recipients = b.recipients.filter((r): r is string => typeof r === "string");
  }

  if (recipients.length === 0) {
    return { ok: false, error: "At least one recipient email is required (recipient_email or recipients[])" };
  }

  for (const email of recipients) {
    if (!EMAIL_RE.test(email)) {
      return { ok: false, error: `Invalid email address: ${email}` };
    }
  }

  if (recipients.length > MAX_RECIPIENTS) {
    return { ok: false, error: `Too many recipients (max ${MAX_RECIPIENTS})` };
  }

  return {
    ok: true,
    data: {
      tenant_id: b.tenant_id as string,
      horse_id: b.horse_id as string,
      event_type: eventType,
      recipients,
      horse_name: typeof b.horse_name === "string" ? b.horse_name : undefined,
      owner_name: typeof b.owner_name === "string" ? b.owner_name : undefined,
      sender_name: typeof b.sender_name === "string" ? b.sender_name : undefined,
      receiver_name: typeof b.receiver_name === "string" ? b.receiver_name : undefined,
      percentage: typeof b.percentage === "number" ? b.percentage : undefined,
      from_owner_name: typeof b.from_owner_name === "string" ? b.from_owner_name : undefined,
      to_owner_name: typeof b.to_owner_name === "string" ? b.to_owner_name : undefined,
      notes: typeof b.notes === "string" ? b.notes : undefined,
    },
  };
}

// ── Email templates (kept identical to previous version) ────────────

function getSubject(action: string, horseName: string): string {
  switch (action) {
    case "added":
      return `You've been added as an owner of ${horseName}`;
    case "removed":
      return `Ownership change notification for ${horseName}`;
    case "updated":
      return `Your ownership in ${horseName} has been updated`;
    case "transferred_in":
      return `You've received ownership in ${horseName}`;
    case "transferred_out":
      return `Ownership transfer notification for ${horseName}`;
    default:
      return `Ownership notification for ${horseName}`;
  }
}

function getEmailHtml(data: ValidatedPayload): string {
  const name = data.owner_name || "Owner";
  const horse = data.horse_name || "your horse";
  const pct = data.percentage;

  switch (data.event_type) {
    case "added":
      return `<h1>Hello ${name}!</h1>
        <p>You have been added as an owner of <strong>${horse}</strong>.</p>
        ${pct ? `<p>Your ownership share: <strong>${pct}%</strong></p>` : ""}
        <p>You can now view and manage this horse in your dashboard.</p>
        <br><p>Best regards,<br>The Equestrian Management Team</p>`;
    case "removed":
      return `<h1>Hello ${name},</h1>
        <p>You have been removed from the ownership of <strong>${horse}</strong>.</p>
        <p>If you believe this was done in error, please contact your stable administrator.</p>
        <br><p>Best regards,<br>The Equestrian Management Team</p>`;
    case "updated":
      return `<h1>Hello ${name}!</h1>
        <p>Your ownership details for <strong>${horse}</strong> have been updated.</p>
        ${pct ? `<p>Your new ownership share: <strong>${pct}%</strong></p>` : ""}
        <br><p>Best regards,<br>The Equestrian Management Team</p>`;
    case "transferred_in":
      return `<h1>Hello ${name}!</h1>
        <p>You have received an ownership transfer for <strong>${horse}</strong>.</p>
        ${pct ? `<p>Transferred share: <strong>${pct}%</strong></p>` : ""}
        ${data.from_owner_name ? `<p>Transfer from: <strong>${data.from_owner_name}</strong></p>` : ""}
        <br><p>Best regards,<br>The Equestrian Management Team</p>`;
    case "transferred_out":
      return `<h1>Hello ${name},</h1>
        <p>An ownership transfer has been made from your share in <strong>${horse}</strong>.</p>
        ${pct ? `<p>Transferred share: <strong>${pct}%</strong></p>` : ""}
        ${data.to_owner_name ? `<p>Transfer to: <strong>${data.to_owner_name}</strong></p>` : ""}
        <br><p>Best regards,<br>The Equestrian Management Team</p>`;
    default:
      return `<h1>Hello ${name},</h1>
        <p>There has been an update to the ownership of <strong>${horse}</strong>.</p>
        <br><p>Best regards,<br>The Equestrian Management Team</p>`;
  }
}

// ── Handler ─────────────────────────────────────────────────────────

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  try {
    // ── 1. Authenticate caller via JWT ──────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ ok: false, error: "Missing or invalid Authorization header" }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return json({ ok: false, error: "Invalid or expired token" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    // ── 2. Validate request body ────────────────────────────────────
    const body = await req.json();
    const validation = validatePayload(body);
    if (!validation.ok) {
      return json({ ok: false, error: validation.error }, 400);
    }
    const payload = validation.data;

    // ── 3. Authorize: caller must be able to manage horses in tenant ─
    const { data: canManage } = await supabase.rpc("can_manage_horses", {
      _user_id: userId,
      _tenant_id: payload.tenant_id,
    });

    if (!canManage) {
      return json({ ok: false, error: "You do not have permission to send ownership notifications for this tenant" }, 403);
    }

    console.log("Ownership notification authorized", {
      user: userId,
      tenant: payload.tenant_id,
      horse: payload.horse_id,
      event: payload.event_type,
      recipientCount: payload.recipients.length,
    });

    // ── 4. Send email(s) via Resend (sandbox-safe) ──────────────────
    const subject = getSubject(payload.event_type, payload.horse_name || "your horse");
    const html = getEmailHtml(payload);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Equestrian <onboarding@resend.dev>",
        to: payload.recipients,
        subject,
        html,
      }),
    });

    const result = await emailResponse.json();

    if (!emailResponse.ok) {
      // Sandbox / unverified domain / delivery errors → 200 with sent:false
      const code = result?.name || result?.statusCode || emailResponse.status;
      console.warn("Resend delivery failed (non-fatal)", {
        status: emailResponse.status,
        code,
        event: payload.event_type,
      });
      return json({
        ok: true,
        sent: false,
        reason: "resend_sandbox_or_delivery_restricted",
        error_code: String(code),
      });
    }

    console.log("Ownership notification sent", { id: result.id });
    return json({ ok: true, sent: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.error("send-ownership-notification error:", message);
    return json({ ok: false, error: message }, 500);
  }
};

serve(handler);
