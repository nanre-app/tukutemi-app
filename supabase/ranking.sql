-- supabase/ranking.sql
-- Supabase SQL Editor で実行する(投稿をお題に紐づけ、AIランキング用の列を追加)

alter table public.posts
  add column if not exists theme_id uuid references public.themes(id) on delete cascade;

alter table public.posts
  add column if not exists score numeric;

create index if not exists posts_theme_rank_idx
  on public.posts (theme_id, score desc nulls last, created_at desc);