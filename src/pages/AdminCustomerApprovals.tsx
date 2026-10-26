import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type ApprovalRow = {
  customer_id: string;
  full_name: string | null;
  phone: string | null;
  verification_status: string | null;
  approval_status: string | null;
  review_note: string | null;
  id_document_url: string | null;
  id_document_name: string | null;
  updated_at: string | null;
};

export default function AdminCustomerApprovals() {
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      const { data: adminRow, error: adminError } = await supabase
        .from("customer_verification_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (adminError) {
        setError(adminError.message);
        setAllowed(false);
        setLoading(false);
        return;
      }

      if (!adminRow) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      setAllowed(true);

      const { data: identityRows, error: identityError } = await supabase
        .from("customer_identity_checks")
        .select("customer_id, verification_status, approval_status, review_note, id_document_url, id_document_name, updated_at")
        .in("approval_status", ["pending"])
        .order("updated_at", { ascending: false });

      if (identityError) {
        setError(identityError.message);
        setLoading(false);
        return;
      }

      const customerIds = (identityRows ?? []).map((item) => item.customer_id);
      const profileMap = new Map<string, { full_name: string | null; phone: string | null }>();

      if (customerIds.length > 0) {
        const { data: profileRows } = await supabase
          .from("profiles")
          .select("id, full_name, phone")
          .in("id", customerIds);

        (profileRows ?? []).forEach((row) => {
          profileMap.set(row.id, { full_name: row.full_name, phone: row.phone });
        });
      }

      setRows(
        (identityRows ?? []).map((item) => {
          const profile = profileMap.get(item.customer_id) ?? { full_name: null, phone: null };
          return {
            customer_id: item.customer_id,
            full_name: profile.full_name,
            phone: profile.phone,
            verification_status: item.verification_status,
            approval_status: item.approval_status,
            review_note: item.review_note,
            id_document_url: item.id_document_url,
            id_document_name: item.id_document_name,
            updated_at: item.updated_at,
          };
        })
      );
      setLoading(false);
    }

    void load();
  }, []);

  const updateStatus = async (customerId: string, approved: boolean, note: string) => {
    setProcessingId(customerId);
    const { error } = await supabase.rpc("review_customer_identity", {
      p_customer_id: customerId,
      p_approved: approved,
      p_note: note,
    });
    setProcessingId(null);

    if (error) {
      setError(error.message);
      return;
    }

    setRows((current) => current.filter((row) => row.customer_id !== customerId));
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8F9FC] px-6 py-12">
        <p className="mx-auto max-w-5xl text-gray-500">Loading customer verification queue…</p>
      </main>
    );
  }

  if (allowed === false) {
    return (
      <main className="min-h-screen bg-[#F8F9FC] px-6 py-12">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-100 p-6">
          <h1 className="text-2xl font-bold text-red-700">Access denied</h1>
          <p className="mt-2 text-red-700">You do not have permission to review customer verifications.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F9FC] px-6 py-12">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer verification approvals</h1>
          <p className="mt-1 text-gray-500">Review identity checks before a customer account can be approved for full use.</p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-100 p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500">
            No customer accounts are currently waiting for approval.
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => (
              <div key={row.customer_id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{row.full_name ?? "Unnamed customer"}</h2>
                    <p className="mt-1 text-sm text-gray-500">{row.phone ?? "No phone on file"}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">{row.verification_status}</span>
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">{row.approval_status}</span>
                    </div>
                    {row.id_document_url && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Uploaded ID</p>
                        <a href={row.id_document_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-semibold text-[#0B5FFF] hover:underline">
                          {row.id_document_name ?? "View identification document"}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={processingId === row.customer_id}
                      onClick={() => void updateStatus(row.customer_id, true, "Approved by admin review.")}
                      className="rounded-xl bg-[#0B5FFF] px-4 py-2 font-semibold text-white disabled:opacity-60"
                    >
                      {processingId === row.customer_id ? "Saving…" : "Approve"}
                    </button>
                    <button
                      type="button"
                      disabled={processingId === row.customer_id}
                      onClick={() => void updateStatus(row.customer_id, false, "Rejected by admin review.")}
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-700 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
