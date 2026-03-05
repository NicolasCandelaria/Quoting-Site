-- Run this in Supabase SQL Editor if you get PGRST204 "Could not find the 'image_urls' column".
-- This adds the columns needed for multiple images per item.

alter table public.items
  add column if not exists image_urls jsonb not null default '[]'::jsonb;

alter table public.items
  add column if not exists preview_image_index integer not null default 0;

-- Optional: backfill image_urls from existing image_base64 so current items show one image
update public.items
set image_urls = jsonb_build_array(image_base64)
where (image_urls is null or image_urls = '[]'::jsonb)
  and image_base64 is not null
  and image_base64 <> '';
