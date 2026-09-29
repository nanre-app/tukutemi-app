-- supabase/themes_seed.sql
-- お題の登録用。週ごとに1行ずつ追記していく
-- 事前に theme-images バケットへ画像をアップロードしておくこと

insert into public.themes (title, image_path, starts_at, post_window_minutes)
values
  ('お題タイトル1', 'theme_01.png', '2026-10-05 09:00:00+09', 90);