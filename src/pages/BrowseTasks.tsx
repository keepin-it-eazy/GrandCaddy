// src/pages/BrowseTasks.tsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type Task = {
  id: number
  title: string
  suburb: string
  status: string
  offered_amount: number
  task_categories: { name: string }[] | null
  users: { full_name: string }[] | null
}

export default function BrowseTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTasks() {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          suburb,
          status,
          offered_amount,
          task_categories:category_id ( name ),
          users:customer_id ( full_name )
        `)
        .order('created_at', { ascending: false })

      if (error) setError(error.message)
      else setTasks((data ?? []) as unknown as Task[])
      setLoading(false)
    }
    fetchTasks()
  }, [])

  if (loading) return <p style={{ padding: 20 }}>Loading tasks…</p>
  if (error) return <p style={{ padding: 20, color: 'red' }}>Error: {error}</p>

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif', maxWidth: 700, margin: '0 auto' }}>
      <h1>GrandCaddy — Open Tasks</h1>
      <p style={{ color: '#666' }}>{tasks.length} task(s) found</p>

      {tasks.map(task => {
        const categoryName = task.task_categories?.[0]?.name ?? 'Uncategorised'
        const customerName = task.users?.[0]?.full_name ?? 'Unknown'

        return (
          <div
            key={task.id}
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: 16,
              marginBottom: 12
            }}
          >
            <h3 style={{ margin: '0 0 8px' }}>
              {categoryName} — {task.title}
            </h3>
            <p style={{ margin: '4px 0' }}>
              <strong>Posted by:</strong> {customerName}
            </p>
            <p style={{ margin: '4px 0' }}>
              <strong>Suburb:</strong> {task.suburb}
            </p>
            <p style={{ margin: '4px 0' }}>
              <strong>Offered:</strong> R{task.offered_amount.toFixed(2)}
            </p>
            <p style={{ margin: '4px 0' }}>
              <strong>Status:</strong>{' '}
              <span style={{
                background: task.status === 'open' ? '#d4edda' : '#fff3cd',
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: 13
              }}>
                {task.status}
              </span>
            </p>
          </div>
        )
      })}
    </div>
  )
}
// src/pages/BrowseTasks.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import AcceptTaskButton from "../components/AcceptTaskButton";

type Task = {
  id: number;
  title: string;
  suburb: string | null;
  status: string;
  offered_amount: number | null;
  preferred_date: string | null;
  preferred_time: string | null;
  task_categories: { name: string } | { name: string }[] | null;
};

function categoryName(task: Task) {
  const c = task.task_categories;
  if (!c) return "Uncategorised";
  return Array.isArray(c) ? c[0]?.name ?? "Uncategorised" : c.name;
}

export default function BrowseTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHelper, setIsHelper] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      // Role is stored in auth metadata at sign-up (see lib/auth.ts)
      setIsHelper(user?.user_metadata?.role === "helper");

      const { data, error } = await supabase
          .from("tasks")
          .select(
              `
          id,
          title,
          suburb,
          status,
          offered_amount,
          preferred_date,
          preferred_time,
          task_categories:category_id ( name )
        `
          )
          .eq("status", "open")
          .order("created_at", { ascending: false });

      if (error) setError(error.message);
      else setTasks((data ?? []) as unknown as Task[]);
      setLoading(false);
    }
    void load();
  }, []);

  if (loading) return <p className="p-6">Loading tasks…</p>;
  if (error) return <p className="p-6 text-red-600">Error: {error}</p>;

  return (
      <main className="min-h-screen bg-[#F8F9FC] px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Open Tasks</h1>
            {isHelper && (
                <Link
                    to="/helper/bookings"
                    className="text-sm font-semibold text-[#0B5FFF] hover:underline"
                >
                  My Bookings →
                </Link>
            )}
          </div>
          <p className="mt-1 text-gray-500">{tasks.length} task(s) available</p>

          {!isHelper && (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Log in with a Caddy account to accept tasks.
              </p>
          )}

          <div className="mt-6 space-y-4">
            {tasks.map((task) => (
                <div
                    key={task.id}
                    className="rounded-2xl border border-gray-200 bg-white p-5"
                >
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#0B5FFF]">
                {categoryName(task)}
              </span>
                  <h3 className="mt-3 text-lg font-semibold">{task.title}</h3>

                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    <p>
                      <strong>Suburb:</strong> {task.suburb ?? "—"}
                    </p>
                    <p>
                      <strong>Offered:</strong> R
                      {Number(task.offered_amount ?? 0).toFixed(2)}
                    </p>
                    <p>
                      <strong>Date:</strong> {task.preferred_date ?? "Flexible"}
                      {task.preferred_time ? ` at ${task.preferred_time}` : ""}
                    </p>
                  </div>

                  {isHelper && (
                      <div className="mt-4">
                        <AcceptTaskButton taskId={task.id} />
                      </div>
                  )}
                </div>
            ))}

            {tasks.length === 0 && (
                <p className="text-gray-500">No open tasks right now. Check back soon.</p>
            )}
          </div>
        </div>
      </main>
  );
}