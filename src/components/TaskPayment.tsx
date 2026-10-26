import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

type Props = { taskId: number; amount: number };
type PaymentStatus = "pending" | "paid" | "failed";
type CheckoutResponse = { checkout_url?: string; fields?: Record<string, string>; error?: string };

export default function TaskPayment({ taskId, amount }: Props) {
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(true);
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("task_payments")
      .select("status")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (loadError) {
      setError("Could not load payment status.");
    } else {
      setStatus((data?.status as PaymentStatus | undefined) ?? null);
    }
    setRefreshing(false);
  }, [taskId]);

  useEffect(() => {
    void loadStatus();
    const refresh = () => { void loadStatus(); };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [loadStatus]);

  const startCheckout = async () => {
    setLoading(true);
    setError("");
    const { data, error: invokeError } = await supabase.functions.invoke<CheckoutResponse>(
      "create-payfast-checkout",
      { body: { task_id: taskId } },
    );
    setLoading(false);

    if (invokeError || !data?.checkout_url || !data.fields) {
      setError(data?.error ?? invokeError?.message ?? "Could not start secure checkout.");
      return;
    }

    const form = document.createElement("form");
    form.method = "POST";
    form.action = data.checkout_url;
    form.style.display = "none";
    for (const [name, value] of Object.entries(data.fields)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Secure payment</h2>
          <p className="mt-1 text-sm text-gray-500">
            PayFast checkout · ZAR {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        {status === "paid" ? (
          <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-800">Payment verified</span>
        ) : (
          <button
            type="button"
            onClick={() => void startCheckout()}
            disabled={loading || refreshing}
            className="rounded-xl bg-[#0B5FFF] px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Starting checkout…" : status === "pending" ? "Resume secure checkout" : status === "failed" ? "Retry payment" : "Pay securely"}
          </button>
        )}
      </div>

      {status === "pending" && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          A payment attempt is awaiting confirmation. Resume checkout if you have not completed it, or refresh after returning from PayFast.
          <button type="button" onClick={() => void loadStatus()} className="ml-2 font-semibold underline">Refresh status</button>
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p>{error}</p>
          {error.toLowerCase().includes("verify your phone") && <Link className="mt-2 inline-block font-semibold underline" to="/profile">Verify your phone in your profile</Link>}
        </div>
      )}
      <p className="mt-4 text-xs text-gray-500">Card details are entered on PayFast. GrandCaddy never stores card numbers or security codes.</p>
    </section>
  );
}
