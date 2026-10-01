import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { StatusBadge } from "../components/TaskCard";
import { one, type TaskDetailRecord } from "../types/task";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6 border-b border-gray-100 py-3 last:border-0">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-900">{value}</dd>
    </div>
  );
}

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<TaskDetailRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTask() {
      if (!id) {
        setError("No task id in the URL.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("tasks")
        .select(
          `
          id,
          title,
          description,
          address,
          suburb,
          status,
          preferred_date,
          preferred_time,
          offered_amount,
          created_at,
          category_id,
          customer_id,
          helper_id,
          task_categories:category_id ( name ),
          users:customer_id ( full_name ),
          helper:helper_id ( full_name )
        `
        )
        .eq("id", id)
        .single();

      if (error) setError(error.message);
      else setTask(data as unknown as TaskDetailRecord);
      setLoading(false);
    }

    void fetchTask();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8F9FC] px-6 py-12">
        <p className="mx-auto max-w-2xl text-gray-500">Loading task…</p>
      </main>
    );
  }

  if (error || !task) {
    return (
      <main className="min-h-screen bg-[#F8F9FC] px-6 py-12">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="rounded-xl border border-red-200 bg-red-100 p-4">
            <p className="text-sm text-red-600">
              {error ?? "That task doesn't exist, or you can't view it."}
            </p>
          </div>
          <Link to="/browse" className="font-semibold text-[#0B5FFF] hover:underline">
            Back to open tasks
          </Link>
        </div>
      </main>
    );
  }

  const categoryName = one(task.task_categories)?.name ?? "Uncategorised";
  const customerName = one(task.users)?.full_name ?? "Unknown";
  const helperName = one(task.helper)?.full_name ?? null;

  const amount =
    task.offered_amount === null || task.offered_amount === undefined
      ? "—"
      : `R${Number(task.offered_amount).toFixed(2)}`;

  const when = [task.preferred_date, task.preferred_time]
    .filter(Boolean)
    .join(" at ");

  return (
    <main className="min-h-screen bg-[#F8F9FC] px-6 py-12">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <Link to="/browse" className="text-sm text-gray-500 hover:text-gray-900">
          ← All tasks
        </Link>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">{categoryName}</p>
              <h1 className="mt-1 text-3xl font-bold text-gray-900">{task.title}</h1>
            </div>
            <StatusBadge status={task.status} />
          </div>

          {task.description && (
            <p className="mt-5 whitespace-pre-line leading-relaxed text-gray-700">
              {task.description}
            </p>
          )}

          <dl className="mt-6 text-sm">
            <Row label="Posted by" value={customerName} />
            <Row label="Suburb" value={task.suburb ?? "—"} />
            <Row label="Address" value={task.address ?? "—"} />
            <Row label="Preferred time" value={when || "Flexible"} />
            <Row label="Offered" value={amount} />
            <Row
              label="Caddy"
              value={
                helperName ??
                (task.status === "open" ? "Not assigned yet" : "Unknown")
              }
            />
          </dl>
        </div>
      </div>
    </main>
  );
}
