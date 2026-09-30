//export default function MyBookings() {
//  return <div style={{ padding: 20 }}>MyBookings — TODO: Luke</div>
//}
// src/pages/MyBookings.tsx
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

type TaskInfo = {
  id: number;
  title: string;
  suburb: string | null;
  offered_amount: number | null;
};

type Booking = {
  id: number;
  task_id: number;
  status: string;
  accepted_at: string;
  completed_at: string | null;
  tasks: TaskInfo | TaskInfo[] | null;
};

function taskOf(b: Booking): TaskInfo | null {
  return Array.isArray(b.tasks) ? b.tasks[0] ?? null : b.tasks;
}

export default function MyBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    const { data, error } = await supabase
        .from("bookings")
        .select(
            `
        id,
        task_id,
        status,
        accepted_at,
        completed_at,
        tasks:task_id ( id, title, suburb, offered_amount )
      `
        )
        .eq("helper_id", user.id)
        .order("accepted_at", { ascending: false });

    if (error) setError(error.message);
    else setBookings((data ?? []) as unknown as Booking[]);
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const markComplete = async (booking: Booking) => {
    setError("");
    setBusyId(booking.id);

    try {
      // a. booking -> completed
      const { error: bookingError } = await supabase
          .from("bookings")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", booking.id);
      if (bookingError) throw bookingError;

      // b. task -> completed
      const { error: taskError } = await supabase
          .from("tasks")
          .update({ status: "completed" })
          .eq("id", booking.task_id);
      if (taskError) throw taskError;

      await load();
    } catch (err) {
      setError(
          err instanceof Error ? err.message : "Could not mark task complete."
      );
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <p className="p-6">Loading bookings…</p>;

  const current = bookings.filter(
      (b) => b.status !== "completed" && b.status !== "cancelled"
  );
  const past = bookings.filter(
      (b) => b.status === "completed" || b.status === "cancelled"
  );

  const renderCard = (b: Booking, isPast: boolean) => {
    const task = taskOf(b);
    return (
        <div
            key={b.id}
            className="rounded-2xl border border-gray-200 bg-white p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-lg font-semibold">
              {task?.title ?? "Task unavailable"}
            </h3>
            <span
                className={
                    "rounded-full px-3 py-1 text-xs font-semibold " +
                    (b.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : b.status === "cancelled"
                            ? "bg-gray-100 text-gray-600"
                            : "bg-blue-50 text-[#0B5FFF]")
                }
            >
            {b.status.replace("_", " ")}
          </span>
          </div>

          <div className="mt-2 space-y-1 text-sm text-gray-600">
            <p>
              <strong>Suburb:</strong> {task?.suburb ?? "—"}
            </p>
            <p>
              <strong>Amount:</strong> R
              {Number(task?.offered_amount ?? 0).toFixed(2)}
            </p>
            <p>
              <strong>{isPast ? "Completed:" : "Accepted:"}</strong>{" "}
              {new Date(
                  isPast && b.completed_at ? b.completed_at : b.accepted_at
              ).toLocaleDateString()}
            </p>
          </div>

          {!isPast && (
              <button
                  type="button"
                  onClick={() => {
                    if (busyId === null) void markComplete(b);
                  }}
                  disabled={busyId === b.id}
                  className="mt-4 rounded-full bg-[#0B5FFF] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#084ed1] disabled:opacity-60"
              >
                {busyId === b.id ? "Saving…" : "Mark Complete"}
              </button>
          )}
        </div>
    );
  };

  return (
      <main className="min-h-screen bg-[#F8F9FC] px-6 py-10">
        <div className="mx-auto max-w-3xl space-y-8">
          <h1 className="text-3xl font-bold">My Bookings</h1>

          {error && (
              <div className="rounded-xl border border-red-200 bg-red-100 p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
          )}

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Current</h2>
            {current.length === 0 && (
                <p className="text-gray-500">
                  No active bookings. Browse open tasks to accept one.
                </p>
            )}
            {current.map((b) => renderCard(b, false))}
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Past</h2>
            {past.length === 0 && (
                <p className="text-gray-500">Nothing completed yet.</p>
            )}
            {past.map((b) => renderCard(b, true))}
          </section>
        </div>
      </main>
  );
}