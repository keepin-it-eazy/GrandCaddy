create table if not exists public.customer_verification_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_identity_checks (
  customer_id uuid primary key references auth.users(id) on delete cascade,
  verification_provider text not null default 'document_review',
  verification_status text not null default 'pending_verification'
    check (verification_status in ('pending_verification', 'pending_identity_review', 'pending_approval', 'verified', 'requires_input', 'rejected', 'canceled', 'approved')),
  approval_status text not null default 'not_submitted'
    check (approval_status in ('not_submitted', 'pending', 'approved', 'rejected')),
  id_document_url text,
  id_document_name text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists verification_status text not null default 'pending_verification'
    check (verification_status in ('pending_verification', 'pending_identity_review', 'pending_approval', 'verified', 'requires_input', 'rejected', 'canceled', 'approved'));

alter table public.customer_verification_admins enable row level security;
alter table public.customer_identity_checks enable row level security;

create or replace function public.is_customer_verification_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.customer_verification_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_customer_verification_admin() from public;
grant execute on function public.is_customer_verification_admin() to authenticated;

create policy "Customers can read their own identity record"
on public.customer_identity_checks
for select
to authenticated
using (customer_id = (select auth.uid()));

create policy "Customer admins can access identity checks"
on public.customer_identity_checks
for select
to authenticated
using (public.is_customer_verification_admin());

create policy "Customer admins can manage verification approvals"
on public.customer_identity_checks
for update
to authenticated
using (public.is_customer_verification_admin())
with check (public.is_customer_verification_admin());

create policy "Customer admins can view admin assignments"
on public.customer_verification_admins
for select
to authenticated
using (public.is_customer_verification_admin());

create or replace function public.review_customer_identity(
  p_customer_id uuid,
  p_approved boolean,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_customer_verification_admin() then
    raise exception 'Admin access required';
  end if;

  update public.customer_identity_checks
  set approval_status = case when p_approved then 'approved' else 'rejected' end,
      verification_status = case when p_approved then 'approved' else 'rejected' end,
      reviewed_by = (select auth.uid()),
      reviewed_at = now(),
      review_note = left(p_note, 1000),
      updated_at = now()
  where customer_id = p_customer_id;

  update public.profiles
  set verification_status = case when p_approved then 'approved' else 'rejected' end
  where id = p_customer_id;
end;
$$;

revoke all on function public.review_customer_identity(uuid, boolean, text) from public;
grant execute on function public.review_customer_identity(uuid, boolean, text) to authenticated;
