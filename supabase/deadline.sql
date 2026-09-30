create or replace function public.enforce_post_deadline()
returns trigger
language plpgsql
as $$
declare
  t record;
begin
  select id, starts_at, post_window_minutes
    into t
    from public.themes
   where starts_at <= now()
   order by starts_at desc
   limit 1;

  if not found then
    raise exception 'no active theme';
  end if;

  if now() >= t.starts_at + make_interval(mins => t.post_window_minutes) then
    raise exception 'post deadline has passed';
  end if;

  return new;
end;
$$;

drop trigger if exists posts_enforce_deadline on public.posts;
create trigger posts_enforce_deadline
  before insert on public.posts
  for each row execute function public.enforce_post_deadline();