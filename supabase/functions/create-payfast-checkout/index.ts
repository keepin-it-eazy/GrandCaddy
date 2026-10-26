import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { payfastSignature } from "../_shared/payfast.ts";

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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const merchantId = Deno.env.get("PAYFAST_MERCHANT_ID");
    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE") ?? "";
    const mode = Deno.env.get("PAYFAST_MODE") ?? "sandbox";
    const siteUrl = Deno.env.get("SITE_URL");

    if (!supabaseUrl || !anonKey || !serviceKey || !merchantId || !siteUrl) {
      return json({ error: "Payment service is not configured." }, 503);
    }
    if (mode !== "sandbox" && mode !== "live") return json({ error: "Invalid payment mode." }, 500);

    const authorization = request.headers.get("Authorization");
    if (!authorization) return json({ error: "Sign in to continue." }, 401);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Your session is invalid. Sign in again." }, 401);
    if (!user.email_confirmed_at || !user.phone_confirmed_at) {
      return json({ error: "Confirm your email and verify your phone number before paying." }, 403);
    }

    const payload = await request.json();
    const taskId = Number(payload?.task_id);
    if (!Number.isSafeInteger(taskId) || taskId <= 0) return json({ error: "Invalid task." }, 400);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: task, error: taskError } = await admin
      .from("tasks")
      .select("id, user_id, helper_id, status, budget, title")
      .eq("id", taskId)
      .maybeSingle();
    if (taskError || !task) return json({ error: "Task not found." }, 404);
    if (task.user_id !== user.id) return json({ error: "You can only pay for your own tasks." }, 403);
    if (!task.helper_id || !["assigned", "in_progress"].includes(task.status)) {
      return json({ error: "Payment is available after a helper accepts the task." }, 409);
    }

    const amount = Number(task.budget);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) {
      return json({ error: "Task has an invalid payment amount." }, 400);
    }

    const { data: priorPayment, error: priorError } = await admin
      .from("task_payments")
      .select("status, merchant_payment_id, amount")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (priorError) return json({ error: "Could not check payment status." }, 500);
    if (priorPayment?.status === "paid") return json({ error: "This task is already paid." }, 409);

    const paymentId = priorPayment?.status === "pending"
      ? priorPayment.merchant_payment_id
      : crypto.randomUUID();
    const roundedAmount = Number(priorPayment?.status === "pending" ? priorPayment.amount : amount).toFixed(2);
    if (priorPayment?.status !== "pending") {
      const { error: saveError } = await admin.from("task_payments").insert({
        task_id: taskId,
        customer_id: user.id,
        merchant_payment_id: paymentId,
        amount: roundedAmount,
        currency: "ZAR",
        status: "pending",
        provider_reference: null,
        verified_at: null,
        updated_at: new Date().toISOString(),
      });
      if (saveError) return json({ error: "Could not create payment." }, 500);
    }

    const origin = new URL(siteUrl).origin;
    const fields: Record<string, string> = {
      merchant_id: merchantId,
      return_url: `${origin}/tasks/${taskId}?payment=return`,
      cancel_url: `${origin}/tasks/${taskId}?payment=cancelled`,
      notify_url: `${supabaseUrl}/functions/v1/payfast-itn`,
      name_first: (user.user_metadata?.full_name as string | undefined)?.slice(0, 50) ?? "GrandCaddy customer",
      email_address: user.email ?? "",
      m_payment_id: paymentId,
      amount: roundedAmount,
      item_name: `GrandCaddy task ${taskId}`.slice(0, 100),
    };
    fields.signature = payfastSignature(fields, passphrase);

    return json({
      checkout_url: mode === "live"
        ? "https://www.payfast.co.za/eng/process"
        : "https://sandbox.payfast.co.za/eng/process",
      fields,
    });
  } catch (error) {
    console.error("create-payfast-checkout failed", error);
    return json({ error: "Unable to start checkout. Please try again." }, 500);
  }
});
