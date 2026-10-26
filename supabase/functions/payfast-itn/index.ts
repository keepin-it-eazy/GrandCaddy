import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { constantTimeEqual, payfastSignature } from "../_shared/payfast.ts";

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const merchantId = Deno.env.get("PAYFAST_MERCHANT_ID");
    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE") ?? "";
    const mode = Deno.env.get("PAYFAST_MODE") ?? "sandbox";
    if (!supabaseUrl || !serviceKey || !merchantId || !["sandbox", "live"].includes(mode)) {
      return new Response("Payment service is not configured", { status: 503 });
    }

    const raw = await request.text();
    const params = new URLSearchParams(raw);
    const fields: Record<string, string> = {};
    params.forEach((value, key) => { fields[key] = value; });
    const receivedSignature = fields.signature ?? "";
    if (!receivedSignature || !constantTimeEqual(receivedSignature, payfastSignature(fields, passphrase))) {
      return new Response("Invalid signature", { status: 400 });
    }
    if (fields.merchant_id !== merchantId || !fields.m_payment_id || !fields.amount_gross) {
      return new Response("Invalid payment details", { status: 400 });
    }

    const validationUrl = mode === "live"
      ? "https://www.payfast.co.za/eng/query/validate"
      : "https://sandbox.payfast.co.za/eng/query/validate";
    const validation = await fetch(validationUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: raw,
    });
    if (!validation.ok || (await validation.text()).trim() !== "VALID") {
      return new Response("PayFast validation failed", { status: 400 });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: payment, error: paymentError } = await admin
      .from("task_payments")
      .select("id, amount, status, task_id")
      .eq("merchant_payment_id", fields.m_payment_id)
      .maybeSingle();
    if (paymentError || !payment) return new Response("Payment record not found", { status: 404 });

    const expectedCents = Math.round(Number(payment.amount) * 100);
    const receivedCents = Math.round(Number(fields.amount_gross) * 100);
    if (!Number.isFinite(receivedCents) || receivedCents !== expectedCents) {
      return new Response("Payment amount mismatch", { status: 400 });
    }
    if (payment.status === "paid") return new Response("OK", { status: 200 });

    const isPaid = fields.payment_status === "COMPLETE";
    const isFailed = fields.payment_status === "FAILED";
    if (!isPaid && !isFailed) return new Response("OK", { status: 200 });

    if (isPaid) {
      const { data: task, error: taskError } = await admin
        .from("tasks")
        .select("id, status, budget")
        .eq("id", payment.task_id)
        .maybeSingle();
      if (taskError || !task || !["assigned", "in_progress"].includes(task.status)) {
        return new Response("Task is not payable", { status: 409 });
      }
      if (Math.round(Number(task.budget) * 100) !== expectedCents) {
        return new Response("Task amount changed", { status: 400 });
      }
    }
    let updateQuery = admin
      .from("task_payments")
      .update({
        status: isPaid ? "paid" : "failed",
        provider_reference: fields.pf_payment_id ?? null,
        verified_at: isPaid ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);
    if (isPaid) updateQuery = updateQuery.neq("status", "paid");
    const { error: updateError } = await updateQuery;
    if (updateError) {
      console.error("Could not persist PayFast notification", updateError);
      return new Response("Could not save payment status", { status: 500 });
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("payfast-itn failed", error);
    return new Response("Notification processing failed", { status: 500 });
  }
});
