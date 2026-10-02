// src/types/task.ts

export type TaskStatus = "open" | "assigned" | "completed";
export type TaskUrgency = "flexible" | "today" | "urgent";
export type TimeSlot = "morning" | "afternoon" | "evening";

export type Embedded<T> = T | T[] | null;

export type TaskCategory = { name: string };
export type UserRef = { full_name: string | null };

export type Task = {
  id: string;
  title: string;
  suburb: string | null;
  status: TaskStatus;
  created_at?: string;
  task_categories?: Embedded<TaskCategory>;
  customer?: Embedded<UserRef>;
  helper?: Embedded<UserRef>;
};

export type TaskDetailRecord = Task & {
  description: string | null;
  address: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  preferred_time_slot: TimeSlot | null;
  category_id: string | null;
  user_id: string;
  helper_id: string | null;
  // NEW from this migration
  urgency: TaskUrgency;
  photos: string[];
  is_recurring: boolean;
  recurrence_note: string | null;
  budget: number | null;
};

export function one<T>(value: Embedded<T> | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}