-- Atomic fixed-window rate-limit bump on the rate_limits table
-- (docs/ARCHITECTURE.md security req #2: max 5 requests/minute/IP on
-- /api/register). One statement so concurrent requests can't race the
-- read-then-write. Returns true when the caller is still within the limit.
create or replace function public.bump_rate_limit(
  p_key text,
  p_max int,
  p_window_seconds int
) returns boolean
language sql
as $$
  insert into public.rate_limits as rl (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update set
    count = case
      when rl.window_start < now() - make_interval(secs => p_window_seconds)
        then 1
      else rl.count + 1
    end,
    window_start = case
      when rl.window_start < now() - make_interval(secs => p_window_seconds)
        then now()
      else rl.window_start
    end
  returning count <= p_max;
$$;

-- Only the service role (API routes) may call this — anon/authenticated
-- could otherwise spam counters via PostgREST RPC.
revoke all on function public.bump_rate_limit(text, int, int) from public;
revoke all on function public.bump_rate_limit(text, int, int) from anon;
revoke all on function public.bump_rate_limit(text, int, int) from authenticated;
grant execute on function public.bump_rate_limit(text, int, int) to service_role;
