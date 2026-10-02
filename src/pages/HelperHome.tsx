// src/pages/HelperHome.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { one } from "../types/task";

type HelperRow = {
  user_id: string;
  suburb: string | null;
  bio: string | null;
  hourly_rate: number | null;
  is_available: boolean;
  verification_status: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

type TaskRow = {
  id: number;
  title: string;
  suburb: string | null;
  status: string;
  budget: number | null;
  urgency: string;
  created_at: string;
  user_id: string;
  task_categories?: { name: string } | { name: string }[] | null;
};

type BookingRow = {
  id: number;
  status: string;
  accepted_at: string;
  completed_at: string | null;
  task: TaskRow | TaskRow[] | null;
};

type Stats = {
  avgRating: number | null;
  reviewCount: number;
  completedThisWeek: number;
};

export default function HelperHome() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [helper, setHelper] = useState<HelperRow | null>(null);
  const [activeBooking, setActiveBooking] = useState<BookingRow | null>(null);
  const [available, setAvailable] = useState<TaskRow[]>([]);
  const [earnings, setEarnings] = useState({ today: 0, week: 0, month: 0 });
  const [stats, setStats] = useState<Stats>({
    avgRating: null,
    reviewCount: 0,
    completedThisWeek: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<number | null>(null);
  const [completing, setCompleting] = useState<number | null>(null);
  const [openingThread, setOpeningThread] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const [p, h] = await Promise.all([
        supabase.from("profiles").select("id, full_name").eq("id", user.id).single(),
        supabase
          .from("helper_profiles")
          .select("user_id, suburb, bio, hourly_rate, is_available, verification_status")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (p.error) { setError(p.error.message); setLoading(false); return; }
      if (!h.data) { navigate("/helper/signup"); return; }

      setProfile(p.data);
      setHelper(h.data);

      const { data: bookings } = await supabase
        .from("bookings")
        .select(`
          id, status, accepted_at, completed_at,
          task:tasks (
            id, title, suburb, status, budget, urgency, created_at, user_id,
            task_categories:category_id ( name )
          )
        `)
        .eq("helper_id", user.id)
        .in("status", ["accepted", "in_progress"])
        .order("accepted_at", { ascending: false })
        .limit(1);

      setActiveBooking((bookings?.[0] as unknown as BookingRow) ?? null);

      const { data: tasks } = await supabase
        .from("tasks")
        .select(`
          id, title, suburb, status, budget, urgency, created_at, user_id,
          task_categories:category_id ( name )
        `)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(6);

      setAvailable((tasks ?? []) as unknown as TaskRow[]);

      const { data: completed } = await supabase
        .from("bookings")
        .select(`
          completed_at,
          task:tasks ( budget )
        `)
        .eq("helper_id", user.id)
        .eq("status", "completed");

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const startOfWeek = startOfDay - 6 * 24 * 60 * 60 * 1000;
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

      const totals = { today: 0, week: 0, month: 0 };
      let completedThisWeek = 0;
      for (const b of completed ?? []) {
        const taskRow = one((b as any).task);
        const amount = Number(taskRow?.budget ?? 0);
        const ts = b.completed_at ? new Date(b.completed_at).getTime() : 0;
        if (ts >= startOfDay)   totals.today += amount;
        if (ts >= startOfWeek)  totals.week  += amount;
        if (ts >= startOfMonth) totals.month += amount;
        if (ts >= startOfWeek)  completedThisWeek += 1;
      }
      setEarnings(totals);

      const { data: reviews } = await supabase
        .from("reviews")
        .select("rating")
        .eq("helper_id", user.id);

      const reviewCount = reviews?.length ?? 0;
      const avgRating =
        reviewCount > 0
          ? Number((reviews!.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviewCount).toFixed(1))
          : null;

      setStats({ avgRating, reviewCount, completedThisWeek });
      setLoading(false);
    }
    void load();
  }, [navigate]);

  const handleAccept = async (taskId: number) => {
    setAccepting(taskId);
    const { error } = await supabase.rpc("accept_task", { p_task_id: taskId });
    setAccepting(null);
    if (error) { setError(error.message); return; }
    setAvailable((prev) => prev.filter((t) => t.id !== taskId));
    navigate(0);
  };

  const handleComplete = async (taskId: number) => {
    if (!confirm("Mark this task as completed?")) return;
    setCompleting(taskId);
    const { error } = await supabase.rpc("complete_task", { p_task_id: taskId });
    setCompleting(null);
    if (error) { setError(error.message); return; }
    navigate(0);
  };

  const openThreadWithCustomer = async (customerId: string) => {
    setOpeningThread(true);
    const { data: threadId, error } = await supabase.rpc("get_or_create_thread", { p_other: customerId });
    setOpeningThread(false);
    if (error) { setError(error.message); return; }
    navigate(`/messages/${threadId}`);
  };

  const firstName = useMemo(
    () => (profile?.full_name ?? "there").split(" ")[0],
    [profile]
  );

  const activeTask = activeBooking ? one(activeBooking.task) : null;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8F9FC] px-6 py-12">
        <p className="mx-auto max-w-6xl text-gray-500">Loading dashboard…</p>
      </main>
    );
  }

  if (error || !helper) {
    return (
      <main className="min-h-screen bg-[#F8F9FC] px-6 py-12">
        <div className="mx-auto max-w-6xl rounded-xl border border-red-200 bg-red-100 p-4">
          <p className="text-sm text-red-600">{error ?? "Something went wrong."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F9FC] px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-8">

        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Welcome back, {firstName} <span className="text-2xl">👋</span>
            </h1>
            <p className="mt-1 text-gray-500">Ready to help and earn today!</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={
                helper.is_available
                  ? "inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700"
                  : "inline-flex items-center gap-2 rounded-full bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-600"
              }
            >
              <span className={helper.is_available ? "h-2 w-2 rounded-full bg-green-500" : "h-2 w-2 rounded-full bg-gray-500"} />
              {helper.is_available ? "Available" : "Offline"}
            </span>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon="⭐"
            label="Rating"
            value={stats.avgRating !== null ? stats.avgRating.toFixed(1) : "—"}
            sub={stats.reviewCount === 0 ? "No reviews yet" : `${stats.reviewCount} review${stats.reviewCount === 1 ? "" : "s"}`}
            tone="amber"
          />
          <StatCard
            icon="💰"
            label="Today's Earnings"
            value={`R${earnings.today.toLocaleString()}`}
            sub={earnings.week > 0 ? `R${earnings.week.toLocaleString()} this week` : "No earnings yet"}
            tone="green"
          />
          <StatCard
            icon="✅"
            label="Tasks Completed"
            value={String(stats.completedThisWeek)}
            sub="This week"
            tone="blue"
          />
        </section>

        {activeBooking && activeTask && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Active Job</h2>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                {activeTask.status}
              </span>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E9EEFB] text-2xl">🛒</span>
                <div>
                  <p className="font-semibold text-gray-900">{activeTask.title}</p>
                  <p className="text-sm text-gray-500">{new Date(activeTask.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                  R{Number(activeTask.budget ?? 0).toLocaleString()}
                </span>
                <Link to={`/tasks/${activeTask.id}`} className="rounded-xl bg-[#0B5FFF] px-4 py-2 text-sm font-semibold text-white">
                  View details
                </Link>
                <button
                  onClick={() => void openThreadWithCustomer(activeTask.user_id)}
                  disabled={openingThread}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-60"
                >
                  {openingThread ? "Opening…" : "Message"}
                </button>
                {activeTask.status !== "completed" && (
                  <button
                    onClick={() => void handleComplete(activeTask.id)}
                    disabled={completing === activeTask.id}
                    className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {completing === activeTask.id ? "Completing…" : "Mark complete"}
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Available Tasks Near You</h2>
            <Link to="/browse" className="text-sm font-semibold text-[#0B5FFF] hover:underline">View all</Link>
          </div>

          {available.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
              <p className="text-gray-600">No open tasks nearby right now.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {available.map((t) => {
                const cat = one(t.task_categories)?.name ?? "Uncategorised";
                return (
                  <li key={t.id} className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E9EEFB] text-xl">🧰</span>
                      <div>
                        <p className="font-semibold text-gray-900">{t.title}</p>
                        <p className="text-sm text-gray-500">
                          {cat} · {t.suburb ?? "—"} · {new Date(t.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                        R{Number(t.budget ?? 0).toLocaleString()}
                      </span>
                      <button
                        onClick={() => void handleAccept(t.id)}
                        disabled={accepting === t.id}
                        className="rounded-xl bg-[#0B5FFF] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {accepting === t.id ? "Accepting…" : "Accept"}
                      </button>
                      <button className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700">
                        Decline
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Earnings Overview</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <EarningTile label="Today" value={earnings.today} />
            <EarningTile label="This Week" value={earnings.week} />
            <EarningTile label="This Month" value={earnings.month} />
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  icon, label, value, sub, tone,
}: {
  icon: string; label: string; value: string; sub: string;
  tone: "amber" | "green" | "blue";
}) {
  const toneBg =
    tone === "amber" ? "bg-amber-100"
    : tone === "green" ? "bg-green-100"
    : "bg-blue-100";
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5">
      <span className={`flex h-12 w-12 items-center justify-center rounded-full text-xl ${toneBg}`}>{icon}</span>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{sub}</p>
      </div>
    </div>
  );
}

function EarningTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-[#F6F7FB] p-4 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">R{value.toLocaleString()}</p>
    </div>
  );
}