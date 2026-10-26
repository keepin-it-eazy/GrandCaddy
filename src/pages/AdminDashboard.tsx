import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [helperPending, setHelperPending] = useState(0);
  const [customerPending, setCustomerPending] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      const [helperAdmin, customerAdmin, helperCount, customerCount] = await Promise.all([
        supabase.from("helper_verification_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
        supabase.from("customer_verification_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
        supabase.from("helper_identity_checks").select("helper_id", { count: "exact", head: true }).eq("approval_status", "pending"),
        supabase.from("customer_identity_checks").select("customer_id", { count: "exact", head: true }).eq("approval_status", "pending"),
      ]);

      if (helperAdmin.error || customerAdmin.error) {
        setError(helperAdmin.error?.message ?? customerAdmin.error?.message ?? "Could not load admin access.");
        setLoading(false);
        return;
      }

      const isAllowed = !!helperAdmin.data || !!customerAdmin.data;
      setAllowed(isAllowed);
      setHelperPending(helperCount.count ?? 0);
      setCustomerPending(customerCount.count ?? 0);
      setLoading(false);
    }

    void load();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8F9FC] px-6 py-12">
        <p className="mx-auto max-w-5xl text-gray-500">Loading admin dashboard…</p>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="min-h-screen bg-[#F8F9FC] px-6 py-12">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-100 p-6">
          <h1 className="text-2xl font-bold text-red-700">Access denied</h1>
          <p className="mt-2 text-red-700">This account is not marked as an admin.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F9FC] px-6 py-12">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">Admin</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">Verification dashboard</h1>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-100 p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Link
            to="/admin/helper-verifications"
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-[#0B5FFF]/30 hover:bg-blue-50"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">Helper approvals</p>
            <p className="mt-4 text-4xl font-black text-gray-900">{helperPending}</p>
            <p className="mt-2 text-sm text-gray-500">Pending helper verification requests</p>
          </Link>

          <Link
            to="/admin/customer-verifications"
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-[#0B5FFF]/30 hover:bg-blue-50"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">Customer approvals</p>
            <p className="mt-4 text-4xl font-black text-gray-900">{customerPending}</p>
            <p className="mt-2 text-sm text-gray-500">Pending customer verification requests</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
