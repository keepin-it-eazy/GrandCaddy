// src/pages/TaskDetail.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { StatusBadge } from "../components/TaskCard";
import TaskPayment from "../components/TaskPayment";
import { one, type TaskDetailRecord } from "../types/task";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6 border-b border-gray-100 py-3 last:border-0">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function AcceptButton({ taskId, onAccepted }: { taskId: number; onAccepted?: (code: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    setLoading(true);
    setError(null);
    const { error: acceptError } = await supabase.rpc("accept_task", { p_task_id: taskId });
    if (acceptError) {
      setLoading(false);
      return setError(acceptError.message);
    }

    const { data, error: codeError } = await supabase.rpc("issue_task_validation_code", { p_task_id: taskId });
    setLoading(false);

    if (codeError || !data) return setError(codeError?.message ?? "Could not issue the validation code.");
    onAccepted?.(String(data));
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

async function createTaskCompletionReviewNotifications({
  taskId,
  taskTitle,
  customerId,
  helperId,
}: {
  taskId: number;
  taskTitle: string;
  customerId: string | null;
  helperId: string | null;
}) {
  if (!customerId && !helperId) return;

  const recipients = [
    customerId ? { user_id: customerId, message: `Task “${taskTitle}” is complete. Please leave a quick rating for the helper.` } : null,
    helperId ? { user_id: helperId, message: `Task “${taskTitle}” is complete. Please leave a quick rating for the customer.` } : null,
  ].filter(Boolean) as { user_id: string; message: string }[];

  if (recipients.length === 0) return;

  const results = await Promise.all(
    recipients.map((recipient) =>
      supabase.rpc("create_task_review_notification", {
        p_user_id: recipient.user_id,
        p_task_id: taskId,
        p_message: recipient.message,
      })
    )
  );

  for (const result of results) {
    if (result.error) {
      console.warn("Could not create task review notification:", result.error.message);
    }
  }
}

function CompleteButton({
  taskId,
  taskTitle,
  customerId,
  helperId,
  onReviewNeeded,
}: {
  taskId: number;
  taskTitle: string;
  customerId: string | null;
  helperId: string | null;
  onReviewNeeded: (payload: {
    taskId: number;
    targetUserId: string;
    targetType: "helper" | "customer";
    targetName: string;
  }) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    if (!confirm("Mark this task as completed?")) return;
    setLoading(true);
    setError(null);
    const { error: completeError } = await supabase.rpc("complete_task", { p_task_id: taskId });
    setLoading(false);
    if (completeError) return setError(completeError.message);

    await createTaskCompletionReviewNotifications({
      taskId,
      taskTitle,
      customerId,
      helperId,
    });

    if (customerId && helperId) {
      onReviewNeeded({
        taskId,
        targetUserId: customerId,
        targetType: "customer",
        targetName: "the customer",
      });
    }
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
  targetUserId,
  targetType,
  targetName,
  onSubmitted,
}: {
  taskId: number;
  targetUserId: string;
  targetType: "helper" | "customer";
  targetName: string;
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
      helper_id: targetType === "helper" ? targetUserId : null,
      customer_id: targetType === "customer" ? targetUserId : null,
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
      <h3 className="text-lg font-semibold text-gray-900">Rate your experience</h3>
      <p className="mt-1 text-sm text-gray-500">
        How was {targetName}? Your feedback helps make the platform better for everyone.
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
          placeholder="Share a quick note about their behaviour or work…"
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
        {saving ? "Submitting…" : "Submit rating"}
      </button>
    </div>
  );
}

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<TaskDetailRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHelper, setIsHelper] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [existingReview, setExistingReview] = useState(false);
  const [generatedValidationCode, setGeneratedValidationCode] = useState<string | null>(null);
  const [validationInput, setValidationInput] = useState("");
  const [validatingCode, setValidatingCode] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pendingReviewRequest, setPendingReviewRequest] = useState<{
    taskId: number;
    targetUserId: string;
    targetType: "helper" | "customer";
    targetName: string;
  } | null>(null);

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
          confirmation_code, validation_code_confirmed_by_customer, validation_code_confirmed_at,
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

        const { data: notifications } = await supabase
          .from("inbox_entries")
          .select("id, task_id, message, metadata")
          .eq("user_id", user.id)
          .eq("type", "task_review_request")
          .eq("is_read", false)
          .order("created_at", { ascending: false })
          .limit(1);

        const reviewNotification = notifications?.[0];
        if (reviewNotification && reviewNotification.task_id) {
          const reviewTaskId = Number(reviewNotification.task_id);
          const targetUserId = (data as any)?.helper_id === user.id ? (data as any)?.user_id : (data as any)?.helper_id;
          const targetType = (data as any)?.helper_id === user.id ? "customer" : "helper";
          const targetName = (data as any)?.helper_id === user.id ? (one((data as any)?.customer)?.full_name ?? "the customer") : (one((data as any)?.helper)?.full_name ?? "the helper");
          if (targetUserId) {
            setPendingReviewRequest({
              taskId: reviewTaskId,
              targetUserId,
              targetType,
              targetName,
            });
            await supabase.from("inbox_entries").update({ is_read: true }).eq("id", reviewNotification.id);
          }
        }
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
  const isCustomerOwner = currentUserId !== null && task.user_id === currentUserId;
  const canComplete = isAssignedHelper && task.status !== "completed" && task.status !== "cancelled";
  const alreadyReviewed = (isOwner || isAssignedHelper) && task.status === "completed" && existingReview;
  const validationCode = generatedValidationCode ?? task.confirmation_code ?? null;

  const handleValidateCode = async () => {
    if (!task.helper_id || !task.confirmation_code) return;
    if (validationInput.trim() !== task.confirmation_code) {
      setValidationError("That code does not match.");
      return;
    }

    setValidatingCode(true);
    setValidationError(null);
    const { data, error } = await supabase.rpc("confirm_task_validation", {
      p_task_id: Number(task.id),
      p_code: validationInput.trim(),
    });
    setValidatingCode(false);

    if (error || !data) {
      setValidationError(error?.message ?? "The validation code could not be confirmed.");
      return;
    }

    setTask({
      ...task,
      status: "in_progress",
      validation_code_confirmed_by_customer: true,
      validation_code_confirmed_at: new Date().toISOString(),
    });
    setValidationInput("");
  };

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

          {canAccept && (
            <AcceptButton
              taskId={Number(task.id)}
              onAccepted={(code) => {
                setGeneratedValidationCode(code);
                setTask({ ...task, status: "assigned" });
              }}
            />
          )}
          {canComplete && (
            <CompleteButton
              taskId={Number(task.id)}
              taskTitle={task.title}
              customerId={task.user_id}
              helperId={task.helper_id}
              onReviewNeeded={(payload) => {
                setPendingReviewRequest(payload);
                setTask((current) => current ? { ...current, status: "completed" } : current);
              }}
            />
          )}
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

        {isAssignedHelper && validationCode && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Validation code</p>
            <p className="mt-3 text-4xl font-black tracking-[0.4em] text-amber-900">{validationCode}</p>
            <p className="mt-2 text-sm text-amber-800">
              Share this code with the customer when you arrive. They need to enter it to confirm the visit.
            </p>
          </div>
        )}

        {isCustomerOwner && task.helper_id && task.status === "assigned" && (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-gray-900">Confirm helper validation</h3>
            <p className="mt-1 text-sm text-gray-500">Enter the 6-digit code the helper gave you.</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                value={validationInput}
                onChange={(event) => setValidationInput(event.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                inputMode="numeric"
                placeholder="123456"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-[#0B5FFF] focus:outline-none focus:ring-1 focus:ring-[#0B5FFF]"
              />
              <button
                type="button"
                onClick={() => void handleValidateCode()}
                disabled={validatingCode || !task.confirmation_code}
                className="rounded-xl bg-[#0B5FFF] px-4 py-3 font-semibold text-white disabled:opacity-60"
              >
                {validatingCode ? "Confirming…" : "Confirm"}
              </button>
            </div>
            {validationError && <p className="mt-3 text-sm text-red-600">{validationError}</p>}
            {task.validation_code_confirmed_by_customer && (
              <p className="mt-3 text-sm font-medium text-green-700">✓ Validation confirmed.</p>
            )}
          </div>
        )}

        {isOwner && task.budget != null && task.helper_id && ["assigned", "in_progress"].includes(task.status) && (
          <TaskPayment taskId={Number(task.id)} amount={Number(task.budget)} />
        )}

        {(isOwner || isAssignedHelper) && task.status === "completed" && !existingReview && task.helper_id && task.user_id && (
          <ReviewForm
            taskId={Number(task.id)}
            targetUserId={isAssignedHelper ? task.user_id : task.helper_id}
            targetType={isAssignedHelper ? "customer" : "helper"}
            targetName={isAssignedHelper ? (customerName || "the customer") : (helperName || "the helper")}
            onSubmitted={() => {
              setExistingReview(true);
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

        {pendingReviewRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Leave a rating</h3>
                  <p className="mt-1 text-sm text-gray-500">How was {pendingReviewRequest.targetName}?</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingReviewRequest(null)}
                  className="rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100"
                  aria-label="Close rating prompt"
                >
                  ✕
                </button>
              </div>
              <ReviewForm
                taskId={pendingReviewRequest.taskId}
                targetUserId={pendingReviewRequest.targetUserId}
                targetType={pendingReviewRequest.targetType}
                targetName={pendingReviewRequest.targetName}
                onSubmitted={() => {
                  setPendingReviewRequest(null);
                  setExistingReview(true);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}