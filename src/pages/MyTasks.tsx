// src/pages/MyTasks.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TaskCard from "../components/TaskCard";
import { supabase } from "../lib/supabaseClient";
import type { Task } from "../types/task";

type Category = { id: number; name: string };

type EditState = {
  id: number;
  title: string;
  description: string;
  category_id: number | null;
  suburb: string;
  address: string;
  budget: number;
  preferred_date: string;
  urgency: "flexible" | "today" | "urgent";
};

const fieldClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-[#0B5FFF] focus:outline-none focus:ring-1 focus:ring-[#0B5FFF]";
const labelClass = "mb-1 block text-sm font-medium text-gray-700";

export default function MyTasks() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Sign in to see your tasks.");
        setLoading(false);
        return;
      }

      const [t, c] = await Promise.all([
        supabase
          .from("tasks")
          .select(`
            id, title, description, suburb, address, status, budget, urgency,
            preferred_date, category_id, created_at,
            task_categories:category_id ( name )
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("task_categories").select("id, name").order("name"),
      ]);

      if (t.error) setError(t.error.message);
      else setTasks((t.data ?? []) as unknown as Task[]);
      setCategories(c.data ?? []);
      setLoading(false);
    }
    void load();
  }, []);

  const openEdit = (raw: any) => {
    setEdit({
      id: raw.id,
      title: raw.title ?? "",
      description: raw.description ?? "",
      category_id: raw.category_id ?? null,
      suburb: raw.suburb ?? "",
      address: raw.address ?? "",
      budget: Number(raw.budget ?? 0),
      preferred_date: raw.preferred_date ?? "",
      urgency: raw.urgency ?? "flexible",
    });
  };

  const saveEdit = async () => {
    if (!edit) return;
    setError(null);
    if (!edit.title.trim()) return setError("Title is required.");
    if (edit.budget <= 0) return setError("Budget must be greater than zero.");

    setSaving(true);
    const { error } = await supabase.rpc("update_task", {
      p_task_id: edit.id,
      p_title: edit.title.trim(),
      p_description: edit.description,
      p_suburb: edit.suburb,
      p_address: edit.address,
      p_budget: edit.budget,
      p_preferred_date: edit.preferred_date || null,
      p_category_id: edit.category_id,
      p_urgency: edit.urgency,
    });
    setSaving(false);

    if (error) return setError(error.message);
    setEdit(null);
    navigate(0);
  };

  const cancelTask = async (taskId: number) => {
    if (!confirm("Cancel this task? This cannot be undone.")) return;
    setBusyId(taskId);
    const { error } = await supabase.rpc("cancel_task", { p_task_id: taskId });
    setBusyId(null);
    if (error) return setError(error.message);
    navigate(0);
  };

  return (
    <main className="min-h-screen bg-[#F8F9FC] px-6 py-12">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My tasks</h1>
            <p className="mt-1 text-gray-500">
              Everything you've posted, newest first.
            </p>
          </div>
          <Link
            to="/post-task"
            className="rounded-xl bg-[#0B5FFF] px-4 py-2.5 font-semibold text-white"
          >
            Post a task
          </Link>
        </div>

        {loading && <p className="text-gray-500">Loading your tasks…</p>}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-100 p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!loading && !error && tasks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center">
            <p className="text-gray-600">You haven't posted a task yet.</p>
            <Link
              to="/post-task"
              className="mt-3 inline-block font-semibold text-[#0B5FFF] hover:underline"
            >
              Post your first task
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {tasks.map((task) => {
            const raw = task as any;
            const canEditOrCancel =
              raw.status === "open" || raw.status === "assigned";

            return (
              <div key={task.id} className="space-y-2">
                <TaskCard task={task} showCustomer={false} />

                {canEditOrCancel && (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {raw.status === "open" && (
                      <button
                        onClick={() => openEdit(raw)}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-400"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => void cancelTask(Number(task.id))}
                      disabled={busyId === Number(task.id)}
                      className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:border-red-400 disabled:opacity-60"
                    >
                      {busyId === Number(task.id) ? "Cancelling…" : "Cancel task"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit modal */}
      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <h2 className="text-xl font-bold text-gray-900">Edit task</h2>
              <button
                onClick={() => setEdit(null)}
                className="rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>Title</label>
                <input
                  className={fieldClass}
                  value={edit.title}
                  onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                />
              </div>

              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  rows={3}
                  className={fieldClass}
                  value={edit.description}
                  onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                />
              </div>

              <div>
                <label className={labelClass}>Category</label>
                <select
                  className={fieldClass}
                  value={edit.category_id ?? ""}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      category_id: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                >
                  <option value="">Choose a category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Suburb</label>
                  <input
                    className={fieldClass}
                    value={edit.suburb}
                    onChange={(e) => setEdit({ ...edit, suburb: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Address (optional)</label>
                  <input
                    className={fieldClass}
                    value={edit.address}
                    onChange={(e) => setEdit({ ...edit, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Budget (R)</label>
                  <input
                    type="number"
                    min="1"
                    className={fieldClass}
                    value={edit.budget}
                    onChange={(e) =>
                      setEdit({ ...edit, budget: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Preferred date</label>
                  <input
                    type="date"
                    className={fieldClass}
                    value={edit.preferred_date}
                    onChange={(e) =>
                      setEdit({ ...edit, preferred_date: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Urgency</label>
                <select
                  className={fieldClass}
                  value={edit.urgency}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      urgency: e.target.value as "flexible" | "today" | "urgent",
                    })
                  }
                >
                  <option value="flexible">Flexible</option>
                  <option value="today">Today</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-100 p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEdit(null)}
                  className="flex-1 rounded-xl border border-gray-300 bg-white py-3 font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void saveEdit()}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-[#0B5FFF] py-3 font-semibold text-white disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}