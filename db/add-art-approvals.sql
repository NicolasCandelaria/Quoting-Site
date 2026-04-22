create extension if not exists pgcrypto;

create table if not exists public.art_approvals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  client_name text not null,
  status text not null default 'draft'
    check (status in ('draft', 'with_designer', 'ready_for_client', 'approved', 'changes_requested')),
  round integer not null default 1 check (round >= 1),
  optional_project_id uuid references public.projects(id) on delete set null,
  optional_item_id uuid references public.items(id) on delete set null,
  notes text,
  review_token_hash text,
  ready_for_client_at timestamptz,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (review_token_hash is null or length(review_token_hash) >= 32)
);

alter table public.art_approvals
  add column if not exists optional_item_id uuid references public.items(id) on delete set null;

create index if not exists idx_art_approvals_status on public.art_approvals(status);
create index if not exists idx_art_approvals_client_name on public.art_approvals(client_name);
create index if not exists idx_art_approvals_project_id on public.art_approvals(optional_project_id);
create index if not exists idx_art_approvals_item_id on public.art_approvals(optional_item_id);
create index if not exists idx_art_approvals_created_at on public.art_approvals(created_at desc);
create unique index if not exists idx_art_approvals_review_token_hash
  on public.art_approvals(review_token_hash)
  where review_token_hash is not null;

-- Designer / AM structured fields (JSON keyed by field id; optional schema_version)
create table if not exists public.art_approval_form_fields (
  art_approval_id uuid primary key references public.art_approvals(id) on delete cascade,
  schema_version integer not null default 1 check (schema_version >= 1),
  fields jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.art_approval_allowlisted_emails (
  id uuid primary key default gen_random_uuid(),
  art_approval_id uuid not null references public.art_approvals(id) on delete cascade,
  email text not null check (email = lower(trim(email))),
  created_at timestamptz not null default now(),
  unique (art_approval_id, email)
);

create index if not exists idx_art_approval_allowlisted_emails_lookup
  on public.art_approval_allowlisted_emails(art_approval_id, email);

create table if not exists public.art_approval_files (
  id uuid primary key default gen_random_uuid(),
  art_approval_id uuid not null references public.art_approvals(id) on delete cascade,
  storage_path text not null,
  original_name text not null,
  content_type text,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  uploaded_by text not null,
  created_at timestamptz not null default now(),
  unique (art_approval_id, storage_path)
);

create index if not exists idx_art_approval_files_approval_created
  on public.art_approval_files(art_approval_id, created_at desc);

create table if not exists public.art_approval_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  art_approval_id uuid not null references public.art_approvals(id) on delete cascade,
  email text not null check (email = lower(trim(email))),
  otp_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  attempts integer not null default 0 check (attempts >= 0),
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (consumed_at is null or consumed_at >= created_at)
);

create index if not exists idx_art_approval_otp_lookup
  on public.art_approval_otp_challenges (art_approval_id, email, created_at desc);
create index if not exists idx_art_approval_otp_active
  on public.art_approval_otp_challenges (art_approval_id, email, expires_at)
  where consumed_at is null;

create table if not exists public.art_approval_client_decisions (
  id uuid primary key default gen_random_uuid(),
  art_approval_id uuid not null references public.art_approvals(id) on delete cascade,
  round integer not null check (round >= 1),
  decision_type text not null check (decision_type in ('approved', 'changes_requested')),
  verified_email text not null check (verified_email = lower(trim(verified_email))),
  typed_full_name text not null check (length(trim(typed_full_name)) > 0),
  comment text,
  decided_at timestamptz not null default now(),
  constraint art_approval_client_decisions_comment_rule check (
    decision_type <> 'changes_requested'
    or length(trim(coalesce(comment, ''))) > 0
  )
);

create index if not exists idx_art_approval_client_decisions_timeline
  on public.art_approval_client_decisions(art_approval_id, round, decided_at desc);

create unique index if not exists idx_art_approval_client_decisions_one_per_round
  on public.art_approval_client_decisions(art_approval_id, round);

alter table public.art_approval_client_decisions
  drop constraint if exists art_approval_client_decisions_check;

alter table public.art_approval_client_decisions
  drop constraint if exists art_approval_client_decisions_comment_rule;

alter table public.art_approval_client_decisions
  add constraint art_approval_client_decisions_comment_rule check (
    decision_type <> 'changes_requested'
    or length(trim(coalesce(comment, ''))) > 0
  );
