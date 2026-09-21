-- =====================================================================
-- tukutemi-app 用のデータベース設定
-- 使い方: Supabase ダッシュボード > SQL Editor に全文を貼り付けて Run
-- =====================================================================

-- 1) お題テーブル -------------------------------------------------------
--    starts_at(開始日時)が過ぎたお題のうち、いちばん新しいものが「今回のお題」になる。
--    毎日切り替えるか毎週切り替えるかは、starts_at の間隔で決まる。
create table if not exists public.themes (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,                       -- お題の名前(画面に表示)
  image_path  text not null,                       -- Storage(theme-images)内のファイル名
  starts_at   timestamptz not null,                -- このお題の開始日時
  created_at  timestamptz not null default now()
);

create index if not exists themes_starts_at_idx on public.themes (starts_at desc);

alter table public.themes enable row level security;

grant select on public.themes to anon, authenticated;

-- 閲覧は誰でも可。ただし開始前のお題は見えない。登録・変更はダッシュボードからだけ。
drop policy if exists "themes_select_started" on public.themes;
create policy "themes_select_started"
  on public.themes for select
  using (starts_at <= now());

-- 2) 投稿テーブル ------------------------------------------------------
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  theme_id    uuid not null references public.themes (id) on delete cascade,
  image_path  text not null,                       -- Storage(post-images)内の保存パス
  created_at  timestamptz not null default now()
);

create index if not exists posts_theme_created_idx on public.posts (theme_id, created_at desc);

alter table public.posts enable row level security;

grant select on public.posts to anon, authenticated;
grant insert on public.posts to authenticated;

-- 閲覧: 誰でも
drop policy if exists "posts_select_everyone" on public.posts;
create policy "posts_select_everyone"
  on public.posts for select
  using (true);

-- 投稿: ログイン済みユーザーが、自分の名前で、今回のお題に対してだけ
drop policy if exists "posts_insert_own_current_theme" on public.posts;
create policy "posts_insert_own_current_theme"
  on public.posts for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and theme_id = (
      select t.id from public.themes t
      where t.starts_at <= now()
      order by t.starts_at desc
      limit 1
    )
  );

-- 3) 画像の保存先(Storage バケット) -----------------------------------
--    post-images : 投稿画像。公開 / 5MBまで / PNG・JPEG・WebP
--    theme-images: お題画像。公開。アップロードはダッシュボードからだけ
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('post-images', 'post-images', true, 5242880, array['image/png', 'image/jpeg', 'image/webp']),
  ('theme-images', 'theme-images', true, 10485760, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 4) Storage のアクセス制限(post-images) -----------------------------
--    アップロード・削除は「自分のユーザーIDのフォルダ」の中だけ
drop policy if exists "post_images_select_everyone" on storage.objects;
create policy "post_images_select_everyone"
  on storage.objects for select
  using (bucket_id = 'post-images');

drop policy if exists "post_images_insert_own_folder" on storage.objects;
create policy "post_images_insert_own_folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "post_images_delete_own_folder" on storage.objects;
create policy "post_images_delete_own_folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
