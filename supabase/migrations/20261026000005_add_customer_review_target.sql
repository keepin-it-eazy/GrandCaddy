alter table public.reviews
  add column if not exists customer_id uuid references auth.users(id) on delete set null;

create index if not exists reviews_customer_id_idx
  on public.reviews (customer_id, created_at desc);

create index if not exists reviews_helper_id_idx
  on public.reviews (helper_id, created_at desc);
