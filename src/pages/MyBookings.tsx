import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import TaskCard from "../components/TaskCard";
import { supabase } from "../lib/supabaseClient";
import type { Task } from "../types/task";

export default function MyBookings() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBookings() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Sign in to see your bookings.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          id,
          helper_id,
          tasks (
            id,
            title,
            suburb,
            status,
            created_at,
            task_categories:category_id ( name ),
            customer:profiles!tasks_user_id_fkey ( full_name )
          )
        `
        )
        .eq("helper_id", user.id);

      if (error) setError(error.message);
      else {
        const bookedTasks = (data ?? []).flatMap((booking) => {
          const task = booking.tasks;
          return Array.isArray(task) ? task : task ? [task] : [];
        }) as unknown as Task[];
        setTasks(bookedTasks);
      }
      setLoading(false);
    }

    void fetchBookings();
  }, []);

  const active = tasks.filter((t) => t.status !== "completed");
  const done = tasks.filter((t) => t.status === "completed");

  return (
    <main className="min-h-screen bg-[#F8F9FC] px-6 py-12">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My bookings</h1>
            <p className="mt-1 text-gray-500">Tasks you've been assigned to.</p>
          </div>
          <Link
            to="/browse"
            className="rounded-xl bg-[#0B5FFF] px-4 py-2.5 font-semibold text-white"
          >
            Find work
          </Link>
        </div>

        {loading && <p className="text-gray-500">Loading your bookings…</p>}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-100 p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!loading && !error && tasks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center">
            <p className="text-gray-600">No bookings yet.</p>
            <Link
              to="/browse"
              className="mt-3 inline-block font-semibold text-[#0B5FFF] hover:underline"
            >
              Browse open tasks
            </Link>
          </div>
        )}

        {active.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming</h2>
            {active.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </section>
        )}

        {done.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Completed</h2>
            {done.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}