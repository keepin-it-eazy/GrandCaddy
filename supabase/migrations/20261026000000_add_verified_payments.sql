create table if not exists public.task_payments (
  id uuid primary key default gen_random_uuid(),
  task_id bigint not null references public.tasks(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  merchant_payment_id text not null unique,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'ZAR' check (currency = 'ZAR'),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  provider_reference text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists task_payments_customer_id_idx
  on public.task_payments(customer_id);
create index if not exists task_payments_task_created_idx
  on public.task_payments(task_id, created_at desc);
create unique index if not exists task_payments_one_pending_per_task_idx
  on public.task_payments(task_id)
  where status = 'pending';

alter table public.task_payments enable row level security;

revoke all on public.task_payments from anon, authenticated;
grant select on public.task_payments to authenticated;

drop policy if exists "Customers can view their task payments" on public.task_payments;
create policy "Customers can view their task payments"
  on public.task_payments
  for select
  to authenticated
  using (customer_id = (select auth.uid()));
