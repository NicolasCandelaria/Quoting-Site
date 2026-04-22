-- Atomic helpers for art approval OTP challenges (PostgREST RPC).
-- Run in Supabase SQL editor after `art_approval_otp_challenges` exists.

create or replace function public.increment_art_approval_otp_challenge_attempts(p_challenge_id uuid)
returns integer
language sql
volatile
as $$
  select attempts from (
    update public.art_approval_otp_challenges
    set attempts = attempts + 1
    where id = p_challenge_id
    returning attempts
  ) t;
$$;

create or replace function public.consume_art_approval_otp_challenge_if_open(p_challenge_id uuid)
returns setof public.art_approval_otp_challenges
language sql
volatile
as $$
  update public.art_approval_otp_challenges
  set consumed_at = now()
  where id = p_challenge_id and consumed_at is null
  returning *;
$$;

grant execute on function public.increment_art_approval_otp_challenge_attempts(uuid) to anon, authenticated, service_role;
grant execute on function public.consume_art_approval_otp_challenge_if_open(uuid) to anon, authenticated, service_role;
