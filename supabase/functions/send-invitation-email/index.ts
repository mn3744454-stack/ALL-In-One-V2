import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_ORIGIN = Deno.env.get("APP_ORIGIN");

// Validate APP_ORIGIN is set (no fallback for security)
if (!APP_ORIGIN) {
  console.error("APP_ORIGIN environment variable is not set");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  invitation_id: string;
  tenant_id: string;
}

const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Administrator",
  manager: "Manager",
  foreman: "Foreman",
  vet: "Veterinarian",
  trainer: "Trainer",
  employee: "Employee",
};

// Simple in-memory rate limiting (per user, 10 requests per minute)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  entry.count++;
  return true;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-invitation-email function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract and validate Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ success: false, error: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Create Supabase client with user's token to verify identity
    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("Invalid token or user not found:", userError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authentication token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const callerId = user.id;
    console.log("Authenticated caller:", callerId);

    // Rate limiting check
    if (!checkRateLimit(callerId)) {
      console.warn("Rate limit exceeded for user:", callerId);
      return new Response(
        JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { invitation_id, tenant_id }: InvitationEmailRequest = await req.json();

    if (!invitation_id || !tenant_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing invitation_id or tenant_id" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Processing invitation:", invitation_id, "for tenant:", tenant_id);

    // Use service role client for privileged operations
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify caller has permission to invite in this tenant
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("tenant_members")
      .select("id, role, can_invite")
      .eq("tenant_id", tenant_id)
      .eq("user_id", callerId)
      .eq("is_active", true)
      .single();

    if (membershipError || !membership) {
      console.error("Caller not a member of tenant:", membershipError);
      return new Response(
        JSON.stringify({ success: false, error: "Not authorized to send invitations for this organization" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user has invite permission (owner/manager always can, or explicit can_invite flag)
    const canInvite = membership.can_invite || ["owner", "manager"].includes(membership.role);
    if (!canInvite) {
      console.error("Caller lacks invite permission:", membership);
      return new Response(
        JSON.stringify({ success: false, error: "You do not have permission to send invitations" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch invitation details including token
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from("invitations")
      .select(`
        id,
        token,
        invitee_email,
        proposed_role,
        sender_id,
        tenant_id
      `)
      .eq("id", invitation_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (invitationError || !invitation) {
      console.error("Invitation not found:", invitationError);
      return new Response(
        JSON.stringify({ success: false, error: "Invitation not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify caller is the sender of this invitation
    if (invitation.sender_id !== callerId) {
      console.error("Caller is not the sender of this invitation");
      return new Response(
        JSON.stringify({ success: false, error: "Not authorized to send this invitation" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch tenant and sender details
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("name")
      .eq("id", tenant_id)
      .single();

    if (tenantError || !tenant) {
      console.error("Tenant not found:", tenantError);
      return new Response(
        JSON.stringify({ success: false, error: "Organization not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: senderProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", callerId)
      .single();

    const senderName = senderProfile?.full_name || "A team member";
    const inviteeEmail = invitation.invitee_email;
    const roleLabel = roleLabels[invitation.proposed_role] || invitation.proposed_role;

    // Validate APP_ORIGIN before building link
    if (!APP_ORIGIN) {
      console.error("APP_ORIGIN is not set - cannot build invitation link");
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error: APP_ORIGIN not set" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build invitation link server-side using the token
    const invitationLink = `${APP_ORIGIN}/invite/${invitation.token}`;
    console.log("Built invitation link:", invitationLink);

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html dir="ltr" lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #c9a227; margin: 0; font-size: 28px; font-weight: 600;">You're Invited!</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
              Hello,
            </p>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
              <strong>${senderName}</strong> has invited you to join <strong>${tenant.name}</strong> as a <strong>${roleLabel}</strong>.
            </p>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 30px;">
              Click the button below to view and respond to this invitation.
            </p>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationLink}" 
                 style="display: inline-block; background-color: #c9a227; color: #1e3a5f; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(201, 162, 39, 0.3);">
                View Invitation
              </a>
            </div>
            
            <p style="color: #888; font-size: 13px; line-height: 1.6; margin: 30px 0 0; border-top: 1px solid #eee; padding-top: 20px;">
              If you don't have an account yet, you'll be able to create one after clicking the link above. Make sure to use this email address (<strong>${inviteeEmail}</strong>) when signing up.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              This invitation was sent by ${tenant.name}
            </p>
          </div>
          
        </div>
      </body>
      </html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Equestrian App <onboarding@resend.dev>",
        to: [inviteeEmail],
        subject: `You've been invited to join ${tenant.name}`,
        html: emailHtml,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", data);
      throw new Error(data.message || "Failed to send email");
    }

    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending invitation email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
