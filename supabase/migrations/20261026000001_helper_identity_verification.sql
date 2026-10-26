create table if not exists public.helper_verification_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.helper_identity_checks (
  helper_id uuid primary key references auth.users(id) on delete cascade,
  verification_provider text not null default 'stripe_identity',
  identity_status text not null default 'not_started'
    check (identity_status in ('not_started', 'processing', 'verified', 'requires_input', 'canceled')),
  approval_status text not null default 'not_submitted'
    check (approval_status in ('not_submitted', 'pending', 'approved', 'rejected')),
  stripe_session_id text,
  stripe_verification_id text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.helper_profiles
  add column if not exists verification_status text not null default 'pending_verification'
    check (verification_status in ('pending_verification', 'pending_identity_review', 'pending_approval', 'verified', 'requires_input', 'rejected', 'canceled', 'approved'));

alter table public.helper_profiles
  add column if not exists approved_at timestamptz;

alter table public.helper_verification_admins enable row level security;
alter table public.helper_identity_checks enable row level security;

create or replace function public.is_helper_verification_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.helper_verification_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_helper_verification_admin() from public;
grant execute on function public.is_helper_verification_admin() to authenticated;

create policy "Helpers can read their own identity record"
on public.helper_identity_checks
for select
to authenticated
using (helper_id = (select auth.uid()));

create policy "Admins can access identity checks"
on public.helper_identity_checks
for select
to authenticated
using (public.is_helper_verification_admin());

create policy "Admins can manage verification approvals"
on public.helper_identity_checks
for update
to authenticated
using (public.is_helper_verification_admin())
with check (public.is_helper_verification_admin());

create policy "Admins can view admin assignments"
on public.helper_verification_admins
for select
to authenticated
using (public.is_helper_verification_admin());

create or replace function public.review_helper_identity(
  p_helper_id uuid,
  p_approved boolean,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_helper_verification_admin() then
    raise exception 'Admin access required';
  end if;

  update public.helper_identity_checks
  set approval_status = case when p_approved then 'approved' else 'rejected' end,
      reviewed_by = (select auth.uid()),
      reviewed_at = now(),
      review_note = left(p_note, 1000),
      updated_at = now()
  where helper_id = p_helper_id;

  update public.helper_profiles
  set verification_status = case when p_approved then 'approved' else 'rejected' end,
      approved_at = case when p_approved then now() else null end
  where user_id = p_helper_id;
end;
$$;

revoke all on function public.review_helper_identity(uuid, boolean, text) from public;
grant execute on function public.review_helper_identity(uuid, boolean, text) to authenticated;

-- Admins are provisioned by a trusted database owner or superuser.
-- Example:
-- insert into public.helper_verification_admins (user_id) values ('<auth.users.id>');
