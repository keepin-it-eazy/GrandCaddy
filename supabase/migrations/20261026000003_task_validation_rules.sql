alter table public.tasks
  add column if not exists confirmation_code text,
  add column if not exists validation_code_confirmed_by_customer boolean not null default false,
  add column if not exists validation_code_confirmed_at timestamptz;

create index if not exists tasks_confirmation_code_idx
  on public.tasks (confirmation_code)
  where confirmation_code is not null;

create or replace function public.issue_task_validation_code(p_task_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks%rowtype;
  v_code text;
begin
  select * into v_task
  from public.tasks
  where id = p_task_id
  for update;

  if not found then
    raise exception 'Task not found';
  end if;

  if v_task.helper_id is null then
    raise exception 'Task does not have an assigned helper';
  end if;

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if v_task.helper_id <> auth.uid() then
    raise exception 'Only the assigned helper can issue the validation code';
  end if;

  v_code := lpad(floor(random() * 900000 + 100000)::text, 6, '0');

  update public.tasks
  set confirmation_code = v_code,
      validation_code_confirmed_by_customer = false,
      validation_code_confirmed_at = null,
      updated_at = now()
  where id = p_task_id;

  return v_code;
end;
$$;

grant execute on function public.issue_task_validation_code(bigint) to authenticated;

create or replace function public.confirm_task_validation(p_task_id bigint, p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks%rowtype;
begin
  select * into v_task
  from public.tasks
  where id = p_task_id
  for update;

  if not found then
    raise exception 'Task not found';
  end if;

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if v_task.user_id <> auth.uid() then
    raise exception 'Only the task owner can confirm the validation code';
  end if;

  if v_task.helper_id is null then
    raise exception 'Task has no assigned helper';
  end if;

  if v_task.status not in ('assigned', 'in_progress') then
    raise exception 'This task is not awaiting validation';
  end if;

  if coalesce(v_task.confirmation_code, '') = '' then
    raise exception 'No validation code has been generated for this task';
  end if;

  if trim(p_code) <> v_task.confirmation_code then
    raise exception 'Incorrect validation code';
  end if;

  update public.tasks
  set status = 'in_progress',
      validation_code_confirmed_by_customer = true,
      validation_code_confirmed_at = now(),
      updated_at = now()
  where id = p_task_id;

  return true;
end;
$$;

grant execute on function public.confirm_task_validation(bigint, text) to authenticated;
