alter table public.items
  add column if not exists custom_fields jsonb not null default '[]'::jsonb;
