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
