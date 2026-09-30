type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
};

export default function Button({
  children,
  onClick,
  type = "button",
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="
        w-full
        rounded-full
        bg-[#0B5FFF]
        py-4
        text-white
        font-semibold
        text-lg
        transition
        duration-300
        hover:bg-[#084ed1]
        active:scale-[0.98]
      "
    >
      {children}
    </button>
  );
}

// src/components/AcceptTaskButton.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

type Props = {
  taskId: number;
};

export default function AcceptTaskButton({ taskId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleAccept = async () => {
    setError("");
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      // a. Create the booking (unique(task_id) stops two helpers taking one task)
      const { error: bookingError } = await supabase.from("bookings").insert({
        task_id: taskId,
        helper_id: user.id,
        status: "accepted",
      });

      if (bookingError) {
        throw new Error(
            bookingError.code === "23505"
                ? "Sorry, another caddy has already accepted this task."
                : bookingError.message
        );
      }

      // b. Mark the task as assigned (only if it is still open)
      const { data: updated, error: taskError } = await supabase
          .from("tasks")
          .update({ status: "assigned", assigned_helper_id: user.id })
          .eq("id", taskId)
          .eq("status", "open")
          .select("id");

      if (taskError || !updated || updated.length === 0) {
        // Roll back the booking so the data stays consistent
        await supabase.from("bookings").delete().eq("task_id", taskId);
        throw new Error(taskError?.message ?? "This task is no longer open.");
      }

      navigate("/helper/bookings");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept task.");
    } finally {
      setLoading(false);
    }
  };

  return (
      <div>
        <button
            type="button"
            onClick={() => {
              if (!loading) void handleAccept();
            }}
            disabled={loading}
            className="rounded-full bg-[#0B5FFF] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#084ed1] disabled:opacity-60"
        >
          {loading ? "Accepting…" : "Accept"}
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
  );
}