create extension if not exists pgcrypto;

create table if not exists public.inbox_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id bigint references public.tasks(id) on delete cascade,
  type text not null default 'general',
  message text not null,
  is_read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.inbox_entries enable row level security;

create index if not exists inbox_entries_user_created_at_idx
  on public.inbox_entries (user_id, created_at desc);

create index if not exists inbox_entries_task_idx
  on public.inbox_entries (task_id);

revoke all on public.inbox_entries from anon, authenticated;
grant select, insert, update on public.inbox_entries to authenticated;

drop policy if exists "Users can read their own inbox entries" on public.inbox_entries;
create policy "Users can read their own inbox entries"
  on public.inbox_entries
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert inbox items for their own account" on public.inbox_entries;
create policy "Users can insert inbox items for their own account"
  on public.inbox_entries
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update their own inbox entries" on public.inbox_entries;
create policy "Users can update their own inbox entries"
  on public.inbox_entries
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.create_task_review_notification(
  p_user_id uuid,
  p_task_id bigint,
  p_message text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into v_task
  from public.tasks
  where id = p_task_id
  for update;

  if not found then
    raise exception 'Task not found';
  end if;

  if auth.uid() not in (v_task.user_id, v_task.helper_id) then
    raise exception 'Only the task owner or assigned helper can trigger notifications';
  end if;

  if p_user_id not in (v_task.user_id, v_task.helper_id) then
    raise exception 'Invalid notification recipient';
  end if;

  insert into public.inbox_entries (user_id, task_id, type, message, metadata)
  values (p_user_id, p_task_id, 'task_review_request', p_message, jsonb_build_object('kind', 'task_completion_review'));

  return true;
end;
$$;

grant execute on function public.create_task_review_notification(uuid, bigint, text) to authenticated;
