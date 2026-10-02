// src/pages/BrowseTasks.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { one } from "../types/task";

type Task = {
  id: number;
  title: string;
  suburb: string | null;
  status: string;
  budget: number | null;
  urgency: string;
  created_at: string;
  task_categories: { name: string }[] | { name: string } | null;
  customer: { full_name: string | null }[] | { full_name: string | null } | null;
};

export default function BrowseTasks() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHelper, setIsHelper] = useState(false);
  const [accepting, setAccepting] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();

      // check helper status
      if (user) {
        const { data: hp } = await supabase
          .from("helper_profiles")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();
        setIsHelper(!!hp);
      }

      const { data, error } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          suburb,
          status,
          budget,
          urgency,
          created_at,
          task_categories:category_id ( name ),
          customer:profiles!tasks_user_id_fkey ( full_name )
        `)
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (error) setError(error.message);
      else setTasks((data ?? []) as unknown as Task[]);
      setLoading(false);
    }
    void load();
  }, []);

  const handleAccept = async (taskId: number) => {
    setAccepting(taskId);
    const { error } = await supabase.rpc("accept_task", { p_task_id: taskId });
    setAccepting(null);

    if (error) {
      setError(error.message);
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    navigate("/helper");
  };

  if (loading) return <p style={{ padding: 20 }}>Loading tasks…</p>;
  if (error) return <p style={{ padding: 20, color: "red" }}>Error: {error}</p>;

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif", maxWidth: 700, margin: "0 auto" }}>
      <h1>GrandCaddy — Open Tasks</h1>
      <p style={{ color: "#666" }}>{tasks.length} task(s) found</p>

      {tasks.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center">
          <p className="text-gray-600">No open tasks right now.</p>
        </div>
      )}

      {tasks.map((task) => {
        const categoryName = one(task.task_categories)?.name ?? "Uncategorised";
        const customerName = one(task.customer)?.full_name ?? "Unknown";

        return (
          <div
            key={task.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <h3 style={{ margin: "0 0 8px" }}>
              {categoryName} — {task.title}
            </h3>
            <p style={{ margin: "4px 0" }}>
              <strong>Posted by:</strong> {customerName}
            </p>
            <p style={{ margin: "4px 0" }}>
              <strong>Suburb:</strong> {task.suburb ?? "—"}
            </p>
            <p style={{ margin: "4px 0" }}>
              <strong>Amount:</strong>{" "}
              {task.budget ? `R${Number(task.budget).toLocaleString()}` : "Not specified"}
            </p>
            <p style={{ margin: "4px 0" }}>
              <strong>Status:</strong>{" "}
              <span
                style={{
                  background: task.status === "open" ? "#d4edda" : "#fff3cd",
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: 13,
                }}
              >
                {task.status}
              </span>
            </p>

            <div className="mt-3 flex gap-2">
              <Link
                to={`/tasks/${task.id}`}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700"
              >
                View details
              </Link>

              {isHelper && task.status === "open" && (
                <button
                  onClick={() => void handleAccept(task.id)}
                  disabled={accepting === task.id}
                  className="rounded-xl bg-[#0B5FFF] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {accepting === task.id ? "Accepting…" : "Accept this task"}
                </button>
              )}

              {!isHelper && (
                <Link
                  to="/helper/signup"
                  className="rounded-xl bg-[#0B5FFF] px-4 py-2 text-sm font-semibold text-white"
                >
                  Become a Caddy to accept
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}