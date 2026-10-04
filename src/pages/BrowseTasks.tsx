// src/pages/BrowseTasks.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { one } from "../types/task";

type Task = {
  id: number;
  title: string;
  description: string | null;
  suburb: string | null;
  status: string;
  budget: number | null;
  urgency: string;
  created_at: string;
  task_categories: { name: string }[] | { name: string } | null;
  customer: { full_name: string | null }[] | { full_name: string | null } | null;
};

type Category = { id: number; name: string };

type SortKey = "newest" | "budget_high" | "budget_low";

export default function BrowseTasks() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suburbs, setSuburbs] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHelper, setIsHelper] = useState(false);
  const [accepting, setAccepting] = useState<number | null>(null);

  // filters
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [suburb, setSuburb] = useState<string>("");
  const [budgetMin, setBudgetMin] = useState<string>("");
  const [budgetMax, setBudgetMax] = useState<string>("");
  const [sort, setSort] = useState<SortKey>("newest");

  // ---- initial load ----
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: hp } = await supabase
          .from("helper_profiles")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();
        setIsHelper(!!hp);
      }

      const [tasksRes, catsRes] = await Promise.all([
        supabase
          .from("tasks")
          .select(`
            id, title, description, suburb, status, budget, urgency, created_at,
            task_categories:category_id ( name ),
            customer:profiles!tasks_user_id_fkey ( full_name )
          `)
          .eq("status", "open")
          .order("created_at", { ascending: false }),
        supabase.from("task_categories").select("id, name").order("name"),
      ]);

      if (tasksRes.error) {
        setError(tasksRes.error.message);
        setLoading(false);
        return;
      }

      const rows = (tasksRes.data ?? []) as unknown as Task[];
      setTasks(rows);
      setCategories(catsRes.data ?? []);

      // distinct suburbs
      const set = new Set<string>();
      rows.forEach((t) => { if (t.suburb) set.add(t.suburb); });
      setSuburbs(Array.from(set).sort());

      setLoading(false);
    }
    void load();
  }, []);

  // ---- client-side filtering + sorting ----
  const visible = useMemo(() => {
    let list = tasks.slice();

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description ?? "").toLowerCase().includes(q)
      );
    }

    if (categoryId !== null) {
      list = list.filter((t) => {
        const c = one(t.task_categories);
        // match by name so we don't have to store the id in the row
        const cat = categories.find((cat) => cat.id === categoryId);
        return cat ? c?.name === cat.name : false;
      });
    }

    if (suburb) list = list.filter((t) => t.suburb === suburb);

    const min = budgetMin === "" ? null : Number(budgetMin);
    const max = budgetMax === "" ? null : Number(budgetMax);
    if (min !== null && !Number.isNaN(min)) list = list.filter((t) => (t.budget ?? 0) >= min);
    if (max !== null && !Number.isNaN(max)) list = list.filter((t) => (t.budget ?? 0) <= max);

    if (sort === "budget_high") {
      list.sort((a, b) => (b.budget ?? 0) - (a.budget ?? 0));
    } else if (sort === "budget_low") {
      list.sort((a, b) => (a.budget ?? 0) - (b.budget ?? 0));
    } else {
      list.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return list;
  }, [tasks, search, categoryId, suburb, budgetMin, budgetMax, sort, categories]);

  const clearFilters = () => {
    setSearch("");
    setCategoryId(null);
    setSuburb("");
    setBudgetMin("");
    setBudgetMax("");
    setSort("newest");
  };

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (search.trim()) n++;
    if (categoryId !== null) n++;
    if (suburb) n++;
    if (budgetMin !== "") n++;
    if (budgetMax !== "") n++;
    if (sort !== "newest") n++;
    return n;
  }, [search, categoryId, suburb, budgetMin, budgetMax, sort]);

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

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8F9FC] px-6 py-12">
        <p className="mx-auto max-w-5xl text-gray-500">Loading tasks…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F9FC] px-6 py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Browse tasks</h1>
            <p className="mt-1 text-gray-500">
              {visible.length} open task{visible.length === 1 ? "" : "s"}
              {activeFilterCount > 0 ? " (filtered)" : ""}
            </p>
          </div>
          <Link
            to="/post-task"
            className="rounded-xl bg-[#0B5FFF] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Post a task
          </Link>
        </div>

        {/* Filter bar */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* search */}
            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                Search
              </label>
              <input
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-[#0B5FFF] focus:outline-none focus:ring-1 focus:ring-[#0B5FFF]"
                placeholder="Search by title or description…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* suburb */}
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                Suburb
              </label>
              <select
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-[#0B5FFF] focus:outline-none"
                value={suburb}
                onChange={(e) => setSuburb(e.target.value)}
              >
                <option value="">All suburbs</option>
                {suburbs.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* sort */}
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                Sort by
              </label>
              <select
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-[#0B5FFF] focus:outline-none"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
              >
                <option value="newest">Newest first</option>
                <option value="budget_high">Budget: high → low</option>
                <option value="budget_low">Budget: low → high</option>
              </select>
            </div>
          </div>

          {/* budget range */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                Min budget (R)
              </label>
              <input
                type="number"
                min="0"
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-[#0B5FFF] focus:outline-none"
                placeholder="0"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                Max budget (R)
              </label>
              <input
                type="number"
                min="0"
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-[#0B5FFF] focus:outline-none"
                placeholder="Any"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2 flex items-end">
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-400"
                >
                  Clear filters ({activeFilterCount})
                </button>
              )}
            </div>
          </div>

          {/* category chips */}
          {categories.length > 0 && (
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCategoryId(null)}
                  className={
                    categoryId === null
                      ? "rounded-full bg-[#0B5FFF] px-4 py-1.5 text-xs font-semibold text-white"
                      : "rounded-full border border-gray-300 px-4 py-1.5 text-xs text-gray-700 hover:border-gray-400"
                  }
                >
                  All
                </button>
                {categories.map((c) => {
                  const on = categoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setCategoryId(on ? null : c.id)}
                      className={
                        on
                          ? "rounded-full bg-[#0B5FFF] px-4 py-1.5 text-xs font-semibold text-white"
                          : "rounded-full border border-gray-300 px-4 py-1.5 text-xs text-gray-700 hover:border-gray-400"
                      }
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-100 p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Results */}
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <p className="text-gray-600">
              {tasks.length === 0
                ? "No open tasks right now."
                : "No tasks match your filters."}
            </p>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="mt-3 font-semibold text-[#0B5FFF] hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map((t) => {
              const categoryName = one(t.task_categories)?.name ?? "Uncategorised";
              const customerName = one(t.customer)?.full_name ?? "Unknown";
              return (
                <li
                  key={t.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#E9EEFB] px-3 py-1 text-xs font-semibold text-[#0B5FFF]">
                          {categoryName}
                        </span>
                        {t.urgency !== "flexible" && (
                          <span
                            className={
                              t.urgency === "urgent"
                                ? "rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700"
                                : "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"
                            }
                          >
                            {t.urgency === "urgent" ? "Urgent" : "Today"}
                          </span>
                        )}
                      </div>

                      <Link
                        to={`/tasks/${t.id}`}
                        className="mt-2 block text-lg font-semibold text-gray-900 hover:text-[#0B5FFF]"
                      >
                        {t.title}
                      </Link>

                      <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                        {t.description ?? "No description"}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span>👤 {customerName}</span>
                        <span>📍 {t.suburb ?? "—"}</span>
                        <span>📅 {new Date(t.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-stretch gap-2 sm:w-40 sm:items-end">
                      <span className="rounded-full bg-green-100 px-3 py-1 text-center text-sm font-semibold text-green-700">
                        R{Number(t.budget ?? 0).toLocaleString()}
                      </span>
                      <Link
                        to={`/tasks/${t.id}`}
                        className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-center text-sm font-semibold text-gray-700"
                      >
                        View details
                      </Link>
                      {isHelper && (
                        <button
                          onClick={() => void handleAccept(t.id)}
                          disabled={accepting === t.id}
                          className="rounded-xl bg-[#0B5FFF] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {accepting === t.id ? "Accepting…" : "Accept"}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}