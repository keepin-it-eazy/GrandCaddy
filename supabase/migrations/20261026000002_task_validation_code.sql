alter table public.tasks
  add column if not exists confirmation_code text,
  add column if not exists validation_code_confirmed_by_customer boolean not null default false,
  add column if not exists validation_code_confirmed_at timestamptz;

create index if not exists tasks_confirmation_code_idx
  on public.tasks (confirmation_code)
  where confirmation_code is not null;
