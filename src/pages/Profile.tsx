// src/pages/Profile.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { signOut } from "../lib/auth";

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
};

type HelperRow = {
  suburb: string | null;
  bio: string | null;
  hourly_rate: number | null;
  is_available: boolean;
  verification_status: string;
};

type PaymentMethod = {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
};

type TaskRow = {
  id: number;
  title: string;
  status: string;
  created_at: string;
  task_categories?: { name: string } | { name: string }[] | null;
};

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer: { full_name: string | null } | { full_name: string | null }[] | null;
};

function pick<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default function Profile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [helper, setHelper] = useState<HelperRow | null>(null);
  const [cards, setCards] = useState<PaymentMethod[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [reviewsLeft, setReviewsLeft] = useState<ReviewRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const [p, h, pm, t, rl] = await Promise.all([
        supabase.from("profiles").select("id, full_name, phone, created_at").eq("id", user.id).single(),
        supabase.from("helper_profiles").select("suburb, bio, hourly_rate, is_available, verification_status").eq("user_id", user.id).maybeSingle(),
        supabase.from("payment_methods").select("id, brand, last4, exp_month, exp_year, is_default").eq("user_id", user.id).order("is_default", { ascending: false }),
        supabase.from("tasks").select("id, title, status, created_at, task_categories:category_id ( name )").eq("user_id", user.id).order("created_at", { ascending: false }).limit(4),
        supabase.from("reviews").select("id, rating, comment, created_at, reviewer:reviewer_id ( full_name )").eq("reviewer_id", user.id).order("created_at", { ascending: false }).limit(3),
      ]);

      if (p.error) {
        setError(p.error.message);
        setLoading(false);
        return;
      }

      setProfile(p.data);
      setFullName(p.data.full_name ?? "");
      setPhone(p.data.phone ?? "");
      setHelper(h.data ?? null);
      setCards((pm.data ?? []) as PaymentMethod[]);
      setTasks((t.data ?? []) as unknown as TaskRow[]);
      setReviewsLeft((rl.data ?? []) as unknown as ReviewRow[]);
      setLoading(false);
    }
    void load();
  }, [navigate]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setProfile({ ...profile, full_name: fullName, phone });
    setEditing(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8F9FC] px-6 py-12">
        <p className="mx-auto max-w-5xl text-gray-500">Loading profile…</p>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="min-h-screen bg-[#F8F9FC] px-6 py-12">
        <div className="mx-auto max-w-5xl rounded-xl border border-red-200 bg-red-100 p-4">
          <p className="text-sm text-red-600">{error ?? "Profile not found."}</p>
        </div>
      </main>
    );
  }

  const initials = (profile.full_name ?? "?")
    .split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  const isHelper = helper !== null;
  const defaultCard = cards.find((c) => c.is_default) ?? cards[0] ?? null;

  return (
    <main className="min-h-screen bg-[#F8F9FC] px-6 py-12">
      <div className="mx-auto w-full max-w-6xl space-y-6">

        {/* Header banner */}
        <section className="rounded-2xl bg-gradient-to-r from-[#E9EEFB] to-[#DCE4FA] p-6">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-3xl font-bold text-[#0B5FFF] shadow">
              {initials}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">
                {profile.full_name ?? "Unnamed"}
              </h1>
              <p className="mt-1 text-gray-600">
                {profile.phone ?? "No phone on file"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#0B5FFF]">
                  {isHelper ? "HELPER" : "CUSTOMER"}
                </span>
                {isHelper && helper?.verification_status && (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600">
                    {helper.verification_status.toUpperCase()}
                  </span>
                )}
                {isHelper && helper?.suburb && (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600">
                    {helper.suburb.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing((e) => !e)}
                className="rounded-xl bg-[#0B5FFF] px-4 py-2 font-semibold text-white"
              >
                {editing ? "Cancel" : "Edit Profile"}
              </button>
              <button
                onClick={() => void handleLogout()}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </section>

        {/* Edit drawer */}
        {editing && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Edit profile</h2>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Full name</label>
              <input
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
              <input
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-xl bg-[#0B5FFF] px-4 py-2 font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </section>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* LEFT: Payment methods */}
          <section className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Payment methods</h2>
                <button className="text-sm font-semibold text-[#0B5FFF] hover:underline">
                  + Add
                </button>
              </div>

              {defaultCard ? (
                <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 p-5 text-white shadow-md">
                  <div className="flex items-start justify-between">
                    <span className="text-2xl">💳</span>
                    <div className="flex gap-2">
                      <span className="h-6 w-6 rounded-full bg-red-500" />
                      <span className="h-6 w-6 rounded-full bg-yellow-400" />
                    </div>
                  </div>
                  <p className="mt-6 tracking-widest">
                    •••• •••• •••• {defaultCard.last4}
                  </p>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-xs uppercase text-gray-300">Card holder</p>
                      <p className="text-sm font-medium">{profile.full_name ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-300">Expires</p>
                      <p className="text-sm font-medium">
                        {String(defaultCard.exp_month).padStart(2, "0")}/
                        {String(defaultCard.exp_year).slice(-2)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center">
                  <p className="text-sm text-gray-500">No payment method on file.</p>
                </div>
              )}

              <div className="mt-5 rounded-xl bg-[#F1F5FF] p-4">
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Billing address
                </p>
                <p className="mt-1 text-sm text-gray-800">
                  {helper?.suburb ? `${helper.suburb}, ` : ""}Paarl
                  <br />
                  Western Cape
                </p>
              </div>
            </div>

            {/* Reviews left */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Reviews left</h2>
                <Link to="/my-tasks" className="text-sm font-semibold text-[#0B5FFF] hover:underline">
                  See all
                </Link>
              </div>
              {reviewsLeft.length === 0 ? (
                <p className="text-sm text-gray-500">
                  You haven't left any reviews yet.
                </p>
              ) : (
                <ul className="space-y-4">
                  {reviewsLeft.map((r) => {
                    const name = pick(r.reviewer)?.full_name ?? "Someone";
                    return (
                      <li key={r.id} className="rounded-xl bg-[#F6F7FB] p-4">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-900">{name}</p>
                          <span className="text-sm text-yellow-500">
                            {"★".repeat(r.rating)}
                            <span className="text-gray-300">
                              {"★".repeat(5 - r.rating)}
                            </span>
                          </span>
                        </div>
                        {r.comment && (
                          <p className="mt-2 text-sm text-gray-700">{r.comment}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* RIGHT: Recent task history */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent task history</h2>
              <div className="flex gap-2">
                <button className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600">
                  Filter
                </button>
                <button className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600">
                  Sort
                </button>
              </div>
            </div>

            {tasks.length === 0 ? (
              <p className="text-sm text-gray-500">No tasks yet.</p>
            ) : (
              <ul className="space-y-3">
                {tasks.map((t) => {
                  const cat = pick(t.task_categories)?.name ?? "Uncategorised";
                  return (
                    <li
                      key={t.id}
                      className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E9EEFB] text-lg">
                          🧾
                        </span>
                        <div>
                          <Link
                            to={`/tasks/${t.id}`}
                            className="font-medium text-gray-900 hover:underline"
                          >
                            {t.title}
                          </Link>
                          <p className="text-xs text-gray-500">
                            {cat} · {new Date(t.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span
                        className={
                          t.status === "completed"
                            ? "rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"
                            : "rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700"
                        }
                      >
                        {t.status}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-5 text-right">
              <Link
                to="/my-tasks"
                className="text-sm font-semibold text-[#0B5FFF] hover:underline"
              >
                View all transaction history →
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}