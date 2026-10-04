// src/pages/TaskDetail.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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

function AcceptButton({ taskId }: { taskId: number }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.rpc("accept_task", { p_task_id: taskId });
    setLoading(false);
    if (error) return setError(error.message);
    navigate("/helper");
  };

  return (
    <div className="mt-6">
      <button
        onClick={() => void handle()}
        disabled={loading}
        className="w-full rounded-xl bg-[#0B5FFF] py-3 font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Accepting…" : "Accept this task"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function CompleteButton({ taskId }: { taskId: number }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    if (!confirm("Mark this task as completed?")) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.rpc("complete_task", { p_task_id: taskId });
    setLoading(false);
    if (error) return setError(error.message);
    navigate(0);
  };

  return (
    <div className="mt-4">
      <button
        onClick={() => void handle()}
        disabled={loading}
        className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Completing…" : "Mark as completed"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function OwnerActions({
  taskId,
  status,
  onCancelled,
}: {
  taskId: number;
  status: string;
  onCancelled: () => void;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    if (!confirm("Cancel this task? This cannot be undone.")) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc("cancel_task", { p_task_id: taskId });
    setBusy(false);
    if (error) return setError(error.message);
    onCancelled();
    navigate("/my-tasks");
  };

  const canEdit = status === "open";
  const canCancel = status === "open" || status === "assigned";

  if (!canEdit && !canCancel) return null;

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      {canEdit && (
        <Link
          to={`/my-tasks`}
          className="flex-1 rounded-xl border border-gray-300 bg-white py-3 text-center font-semibold text-gray-700"
        >
          Edit in My Tasks
        </Link>
      )}
      {canCancel && (
        <button
          onClick={() => void handleCancel()}
          disabled={busy}
          className="flex-1 rounded-xl border border-red-300 bg-white py-3 font-semibold text-red-600 disabled:opacity-60"
        >
          {busy ? "Cancelling…" : "Cancel task"}
        </button>
      )}
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </div>
  );
}

function ReviewForm({
  taskId,
  helperId,
  onSubmitted,
}: {
  taskId: number;
  helperId: string;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return setError("Session expired."); }

    const { error } = await supabase.from("reviews").insert({
      reviewer_id: user.id,
      helper_id: helperId,
      task_id: taskId,
      rating,
      comment: comment.trim() || null,
    });
    setSaving(false);

    if (error) {
      setError(error.code === "23505" ? "You've already reviewed this task." : error.message);
      return;
    }
    onSubmitted();
  };

  return (
    <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900">Leave a review</h3>
      <p className="mt-1 text-sm text-gray-500">
        How did your Caddy do? Your review helps other customers.
      </p>

      <div className="mt-4">
        <p className="mb-1 text-sm font-medium text-gray-700">Rating</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={n <= rating ? "text-2xl text-yellow-500" : "text-2xl text-gray-300 hover:text-yellow-400"}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="comment">
          Comment (optional)
        </label>
        <textarea
          id="comment"
          rows={4}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-[#0B5FFF] focus:outline-none focus:ring-1 focus:ring-[#0B5FFF]"
          placeholder="Tell others about your experience…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-100 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={saving}
        className="mt-4 w-full rounded-xl bg-[#0B5FFF] py-3 font-semibold text-white disabled:opacity-60"
      >
        {saving ? "Submitting…" : "Submit review"}
      </button>
    </div>
  );
}

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<TaskDetailRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHelper, setIsHelper] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [existingReview, setExistingReview] = useState(false);

  useEffect(() => {
    async function fetchTask() {
      if (!id) { setError("No task id in the URL."); setLoading(false); return; }

      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setCurrentUserId(user.id);
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
          id, title, description, address, suburb, status,
          preferred_date, preferred_time, created_at,
          category_id, user_id, helper_id, budget, urgency,
          task_categories:category_id ( name ),
          customer:profiles!tasks_user_id_fkey ( full_name ),
          helper:profiles!tasks_helper_id_fkey   ( full_name )
        `)
        .eq("id", id)
        .single();

      if (error) { setError(error.message); setLoading(false); return; }

      setTask(data as unknown as TaskDetailRecord);
      if (user && data && (data as any).user_id === user.id) setIsOwner(true);

      if (user) {
        const { data: r } = await supabase
          .from("reviews")
          .select("id")
          .eq("task_id", Number(id))
          .eq("reviewer_id", user.id)
          .maybeSingle();
        setExistingReview(!!r);
      }

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
  const customerName = one(task.customer)?.full_name ?? "Unknown";
  const helperName = one(task.helper)?.full_name ?? null;

  const when = [task.preferred_date, task.preferred_time].filter(Boolean).join(" at ");

  const canAccept = isHelper && task.status === "open" && !isOwner;
  const isAssignedHelper = isHelper && currentUserId !== null && task.helper_id === currentUserId;
  const canComplete = isAssignedHelper && task.status !== "completed" && task.status !== "cancelled";
  const canReview = isOwner && task.status === "completed" && !!task.helper_id && !existingReview;
  const alreadyReviewed = isOwner && task.status === "completed" && existingReview;

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
            <Row
              label="Budget"
              value={task.budget != null ? `R${Number(task.budget).toLocaleString()}` : "—"}
            />

            <div className="flex justify-between gap-6 border-b border-gray-100 py-3 last:border-0">
              <dt className="text-gray-500">Caddy</dt>
              <dd className="text-right font-medium text-gray-900">
                {task.helper_id ? (
                  <Link to={`/helpers/${task.helper_id}`} className="text-[#0B5FFF] hover:underline">
                    {helperName ?? "View helper"} →
                  </Link>
                ) : task.status === "open" ? (
                  "Not assigned yet"
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>

          {canAccept && <AcceptButton taskId={Number(task.id)} />}
          {canComplete && <CompleteButton taskId={Number(task.id)} />}
          {isOwner && <OwnerActions taskId={Number(task.id)} status={task.status} onCancelled={() => setTask({ ...task, status: "cancelled" })} />}

          {!isHelper && task.status === "open" && !isOwner && (
            <div className="mt-6">
              <Link
                to="/helper/signup"
                className="block w-full rounded-xl bg-[#0B5FFF] py-3 text-center font-semibold text-white"
              >
                Become a Caddy to accept
              </Link>
            </div>
          )}
        </div>

        {canReview && task.helper_id && (
          <ReviewForm
            taskId={Number(task.id)}
            helperId={task.helper_id}
            onSubmitted={() => {
              setExistingReview(true);
              navigate(0);
            }}
          />
        )}

        {alreadyReviewed && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm text-green-700">
              ✓ Thanks — you've already reviewed this task.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}