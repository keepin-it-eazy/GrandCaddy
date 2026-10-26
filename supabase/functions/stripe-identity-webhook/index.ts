import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17.6.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "stripe-signature, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!stripeSecret || !webhookSecret || !serviceRole) {
    return json({ error: "Stripe webhook is not configured." }, 503);
  }

  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  if (!signature) return json({ error: "Missing Stripe signature." }, 400);

  try {
    const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" });
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceRole,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );

    const sessionId = event.data.object.id as string;
    const helperId = (event.data.object as { metadata?: { helper_id?: string } }).metadata?.helper_id;

    const { data: current, error: lookupError } = await adminClient
      .from("helper_identity_checks")
      .select("helper_id")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    if (lookupError) {
      console.error("Could not resolve Stripe session", lookupError);
      return json({ error: "Could not resolve stripe session." }, 500);
    }

    const targetHelperId = helperId ?? current?.helper_id ?? null;
    let identityStatus = "processing";
    let approvalStatus = "not_submitted";
    let helperVerification = "pending_identity_review";

    if (event.type === "identity.verification_session.verified") {
      identityStatus = "verified";
      approvalStatus = "pending";
      helperVerification = "pending_approval";
    } else if (event.type === "identity.verification_session.requires_input") {
      identityStatus = "requires_input";
      helperVerification = "requires_input";
    } else if (event.type === "identity.verification_session.canceled") {
      identityStatus = "canceled";
      helperVerification = "canceled";
    }

    if (targetHelperId) {
      const { error: updateProfileError } = await adminClient
        .from("helper_profiles")
        .update({ verification_status: helperVerification })
        .eq("user_id", targetHelperId);

      if (updateProfileError) {
        console.error("Could not update helper profile verification", updateProfileError);
      }
    }

    const { error: updateError } = await adminClient
      .from("helper_identity_checks")
      .update({
        identity_status: identityStatus,
        approval_status: approvalStatus,
        stripe_verification_id: sessionId,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_session_id", sessionId);

    if (updateError) {
      console.error("Could not update helper identity record", updateError);
      return json({ error: "Could not persist verification state." }, 500);
    }

    return json({ received: true, event: event.type });
  } catch (error) {
    console.error("stripe-identity-webhook failed", error);
    return json({ error: "Invalid Stripe signature." }, 400);
  }
});
