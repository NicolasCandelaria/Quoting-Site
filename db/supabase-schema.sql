-- Supabase schema for quote-sheet prototype
-- Run in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  short_description text not null,
  image_base64 text,
  material text not null default '',
  size text not null default '',
  logo text not null default '',
  pre_production_sample_time text not null default '',
  pre_production_sample_fee text not null default '',
  packing_details text not null default '',
  price_tiers jsonb not null default '[]'::jsonb
);

create index if not exists idx_items_project_id on public.items(project_id);

-- optional: enable row-level security for future auth hardening
alter table public.projects enable row level security;
alter table public.items enable row level security;
