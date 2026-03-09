alter table public.projects
  add column if not exists pricing_basis text not null default 'DDP',
  add column if not exists contact_name text;

update public.projects
set pricing_basis = 'DDP'
where pricing_basis is null;

