
export type TaskStatus = 'open' | 'assigned' | 'completed'

export type Embedded<T> = T | T[] | null

export type TaskCategory = { name: string }
export type UserRef = { full_name: string | null }

export type Task = {
  id: number
  title: string
  suburb: string | null
  status: TaskStatus
  offered_amount: number | null
  created_at?: string
  task_categories?: Embedded<TaskCategory>
  users?: Embedded<UserRef>
}

export type TaskDetailRecord = Task & {
  description: string | null
  address: string | null
  preferred_date: string | null
  preferred_time: string | null
  category_id: number | null
  customer_id: string
  helper_id: string | null
  helper?: Embedded<UserRef>
}

export function one<T>(value: Embedded<T> | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}
