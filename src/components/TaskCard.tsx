// src/components/TaskCard.tsx
import { Link } from "react-router-dom";
import { one, type Task, type TaskStatus } from "../types/task";

const statusLabels: Record<TaskStatus, string> = {
    open: "Open",
    assigned: "Assigned",
    completed: "Completed",
    cancelled: "Cancelled",
    in_progress: ""
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const styles: Record<TaskStatus, string> = {
      open: "bg-emerald-100 text-emerald-700",
      assigned: "bg-amber-100 text-amber-700",
      completed: "bg-gray-100 text-gray-600",
      cancelled: "bg-red-100 text-red-600",
      in_progress: ""
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

export default function TaskCard({
  task,
  showCustomer = true,
}: {
  task: Task;
  showCustomer?: boolean;
}) {
  const categoryName = one(task.task_categories)?.name ?? "Uncategorised";
  const customerName = one(task.customer)?.full_name ?? "Unknown";

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">{categoryName}</p>
          <h3 className="mt-1 text-xl font-semibold text-gray-900">{task.title}</h3>
        </div>
        <StatusBadge status={task.status} />
      </div>

      <div className="mt-4 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
        <p>
          <span className="font-medium text-gray-900">Suburb:</span>{" "}
          {task.suburb ?? "Not specified"}
        </p>
        <p>
          <span className="font-medium text-gray-900">Amount:</span> Not specified
        </p>
        {showCustomer && (
          <p>
            <span className="font-medium text-gray-900">Posted by:</span> {customerName}
          </p>
        )}
      </div>

      <Link
        to={`/tasks/${task.id}`}
        className="mt-5 inline-block font-semibold text-[#0B5FFF] hover:underline"
      >
        View task
      </Link>
    </article>
  );
}