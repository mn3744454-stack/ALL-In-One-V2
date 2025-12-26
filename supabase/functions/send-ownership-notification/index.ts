import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OwnershipNotificationRequest {
  owner_email: string;
  owner_name: string;
  horse_name: string;
  action: "added" | "removed" | "updated" | "transferred_in" | "transferred_out";
  percentage?: number;
  from_owner_name?: string;
  to_owner_name?: string;
}

const getSubject = (action: string, horseName: string): string => {
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
};

const getEmailContent = (data: OwnershipNotificationRequest): string => {
  const { owner_name, horse_name, action, percentage, from_owner_name, to_owner_name } = data;

  switch (action) {
    case "added":
      return `
        <h1>Hello ${owner_name}!</h1>
        <p>You have been added as an owner of <strong>${horse_name}</strong>.</p>
        ${percentage ? `<p>Your ownership share: <strong>${percentage}%</strong></p>` : ""}
        <p>You can now view and manage this horse in your dashboard.</p>
        <br>
        <p>Best regards,<br>The Equestrian Management Team</p>
      `;

    case "removed":
      return `
        <h1>Hello ${owner_name},</h1>
        <p>This is to inform you that you have been removed from the ownership of <strong>${horse_name}</strong>.</p>
        <p>If you believe this was done in error, please contact your stable administrator.</p>
        <br>
        <p>Best regards,<br>The Equestrian Management Team</p>
      `;

    case "updated":
      return `
        <h1>Hello ${owner_name}!</h1>
        <p>Your ownership details for <strong>${horse_name}</strong> have been updated.</p>
        ${percentage ? `<p>Your new ownership share: <strong>${percentage}%</strong></p>` : ""}
        <p>You can view the updated details in your dashboard.</p>
        <br>
        <p>Best regards,<br>The Equestrian Management Team</p>
      `;

    case "transferred_in":
      return `
        <h1>Hello ${owner_name}!</h1>
        <p>You have received an ownership transfer for <strong>${horse_name}</strong>.</p>
        ${percentage ? `<p>Transferred share: <strong>${percentage}%</strong></p>` : ""}
        ${from_owner_name ? `<p>Transfer from: <strong>${from_owner_name}</strong></p>` : ""}
        <p>You can now view and manage this horse in your dashboard.</p>
        <br>
        <p>Best regards,<br>The Equestrian Management Team</p>
      `;

    case "transferred_out":
      return `
        <h1>Hello ${owner_name},</h1>
        <p>An ownership transfer has been made from your share in <strong>${horse_name}</strong>.</p>
        ${percentage ? `<p>Transferred share: <strong>${percentage}%</strong></p>` : ""}
        ${to_owner_name ? `<p>Transfer to: <strong>${to_owner_name}</strong></p>` : ""}
        <p>You can view the updated details in your dashboard.</p>
        <br>
        <p>Best regards,<br>The Equestrian Management Team</p>
      `;

    default:
      return `
        <h1>Hello ${owner_name},</h1>
        <p>There has been an update to the ownership of <strong>${horse_name}</strong>.</p>
        <p>Please check your dashboard for more details.</p>
        <br>
        <p>Best regards,<br>The Equestrian Management Team</p>
      `;
  }
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: OwnershipNotificationRequest = await req.json();

    console.log("Sending ownership notification:", {
      to: data.owner_email,
      action: data.action,
      horse: data.horse_name,
    });

    // Validate required fields
    if (!data.owner_email || !data.owner_name || !data.horse_name || !data.action) {
      console.error("Missing required fields:", data);
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const subject = getSubject(data.action, data.horse_name);
    const htmlContent = getEmailContent(data);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Equestrian <onboarding@resend.dev>",
        to: [data.owner_email],
        subject: subject,
        html: htmlContent,
      }),
    });

    const result = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", result);
      throw new Error(result.message || "Failed to send email");
    }

    console.log("Email sent successfully:", result);

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-ownership-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
