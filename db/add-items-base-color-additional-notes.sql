-- Add optional base_color and additional_notes to items (replacing custom_fields approach).
alter table public.items
  add column if not exists base_color text default '';

alter table public.items
  add column if not exists additional_notes text default '';
