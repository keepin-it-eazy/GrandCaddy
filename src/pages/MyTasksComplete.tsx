import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

export default function MyTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMyTasks() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Sign in to see your tasks.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("tasks")
        .select(
          `
          id,
          title,
          suburb,
          status,
          offered_amount,
          created_at,
          task_categories:category_id ( name )
        `
        )
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) setError(error.message);
      else setTasks((data ?? []) as unknown as Task[]);
      setLoading(false);
    }

    void fetchMyTasks();
  }, []);

  return (
    <main className="min-h-screen bg-[#F8F9FC] px-6 py-12">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My tasks</h1>
            <p className="mt-1 text-gray-500">Everything you've posted, newest first.</p>
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
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} showCustomer={false} />
          ))}
        </div>
      </div>
    </main>
  );
}
