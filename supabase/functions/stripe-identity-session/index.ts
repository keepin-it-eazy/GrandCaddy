import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17.6.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !stripeSecret) {
      return json({ error: "Identity verification is not configured." }, 503);
    }

    const authorization = request.headers.get("Authorization");
    if (!authorization) return json({ error: "Sign in to continue." }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Your session is invalid. Sign in again." }, 401);
    if (!user.email_confirmed_at || !user.phone_confirmed_at) {
      return json({ error: "Verify your email and phone before starting identity review." }, 403);
    }

    const body: unknown = await request.json();
    if (
      !body ||
      typeof body !== "object" ||
      !("id_document_url" in body) ||
      !("id_document_name" in body) ||
      typeof body.id_document_url !== "string" ||
      typeof body.id_document_name !== "string" ||
      !body.id_document_url ||
      !body.id_document_name
    ) {
      return json({ error: "Upload your ID before submitting your application." }, 400);
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" });
    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: { helper_id: user.id },
      options: {
        document: {
          allowed_types: [
            "driving_license",
            "passport",
            "national_identity_card",
            "residence_permit",
          ],
          require_matching_selfie: true,
        },
      },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error: saveError } = await adminClient.from("helper_identity_checks").upsert(
      {
        helper_id: user.id,
        verification_provider: "stripe_identity",
        identity_status: "processing",
        approval_status: "pending",
        id_document_url: body.id_document_url,
        id_document_name: body.id_document_name,
        stripe_session_id: session.id,
        stripe_verification_id: session.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "helper_id" }
    );

    if (saveError) {
      console.error("Could not save Stripe identity session", saveError);
      return json({ error: "Failed to track your identity verification." }, 500);
    }

    const { error: profileError } = await adminClient
      .from("helper_profiles")
      .upsert({ user_id: user.id, verification_status: "pending_identity_review" }, { onConflict: "user_id" });

    if (profileError) {
      console.error("Could not update helper verification status", profileError);
      return json({ error: "Profile updated, but verification status could not be saved." }, 500);
    }

    return json({
      message: "Identity verification session created.",
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("stripe-identity-session failed", error);
    return json({ error: "Unable to start identity verification. Please try again." }, 500);
  }
});
