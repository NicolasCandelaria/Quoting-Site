create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client text not null,
  notes text,
  created_at timestamptz not null default now(),
  pricing_basis text not null default 'DDP',
  contact_name text,
  quote_date text
);

create table if not exists public.items (
  id uuid primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  short_description text not null default '',
  image_urls jsonb not null default '[]'::jsonb,
  preview_image_index integer not null default 0,
  image_base64 text,
  material text not null default '',
  size text not null default '',
  logo text not null default '',
  pre_production_sample_time text not null default '',
  pre_production_sample_fee text not null default '',
  packing_details text not null default '',
  base_color text default '',
  additional_notes text default '',
  price_tiers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.items
  add column if not exists image_urls jsonb not null default '[]'::jsonb;

alter table public.items
  add column if not exists preview_image_index integer not null default 0;

alter table public.items
  add column if not exists image_base64 text;

update public.items
set image_urls =
  case
    when jsonb_typeof(image_urls) = 'array' and jsonb_array_length(image_urls) > 0 then image_urls
    when image_base64 is not null and image_base64 <> '' then jsonb_build_array(image_base64)
    else '[]'::jsonb
  end
where image_urls is null or image_urls = '[]'::jsonb;

update public.items
set preview_image_index = 0
where preview_image_index is null or preview_image_index < 0;

create index if not exists idx_items_project_id on public.items(project_id);

alter table public.projects
  add column if not exists quote_date text;

alter table public.items
  add column if not exists base_color text default '';

alter table public.items
  add column if not exists additional_notes text default '';

-- Approved account managers (allowlist for secure login link / email sign-in)
create table if not exists public.approved_account_managers (
  email text primary key
);

-- Creator attribution for projects
alter table public.projects
  add column if not exists created_by text;

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

create index if not exists idx_art_approvals_status on public.art_approvals(status);
create index if not exists idx_art_approvals_client_name on public.art_approvals(client_name);
create index if not exists idx_art_approvals_project_id on public.art_approvals(optional_project_id);
create index if not exists idx_art_approvals_item_id on public.art_approvals(optional_item_id);
create index if not exists idx_art_approvals_created_at on public.art_approvals(created_at desc);
create unique index if not exists idx_art_approvals_review_token_hash
  on public.art_approvals(review_token_hash)
  where review_token_hash is not null;

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

