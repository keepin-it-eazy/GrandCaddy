alter table public.helper_identity_checks
  add column if not exists id_document_url text,
  add column if not exists id_document_name text;

create index if not exists helper_identity_checks_pending_review_idx
  on public.helper_identity_checks (approval_status, updated_at desc);
