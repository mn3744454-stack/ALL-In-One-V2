import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  invitee_email: string;
  tenant_name: string;
  sender_name: string;
  proposed_role: string;
  invitation_link: string;
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

const handler = async (req: Request): Promise<Response> => {
  console.log("send-invitation-email function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      invitee_email, 
      tenant_name, 
      sender_name, 
      proposed_role,
      invitation_link 
    }: InvitationEmailRequest = await req.json();

    console.log("Sending invitation email to:", invitee_email);
    console.log("From tenant:", tenant_name);
    console.log("Role:", proposed_role);

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const roleLabel = roleLabels[proposed_role] || proposed_role;

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
              <strong>${sender_name}</strong> has invited you to join <strong>${tenant_name}</strong> as a <strong>${roleLabel}</strong>.
            </p>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 30px;">
              Click the button below to view and respond to this invitation.
            </p>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitation_link}" 
                 style="display: inline-block; background-color: #c9a227; color: #1e3a5f; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(201, 162, 39, 0.3);">
                View Invitation
              </a>
            </div>
            
            <p style="color: #888; font-size: 13px; line-height: 1.6; margin: 30px 0 0; border-top: 1px solid #eee; padding-top: 20px;">
              If you don't have an account yet, you'll be able to create one after clicking the link above. Make sure to use this email address (<strong>${invitee_email}</strong>) when signing up.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              This invitation was sent by ${tenant_name}
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
        to: [invitee_email],
        subject: `You've been invited to join ${tenant_name}`,
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
