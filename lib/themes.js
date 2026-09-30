import { supabase } from '@/lib/supabaseClient';

// お題画像を保存しているバケット名。supabase/schema.sql と揃えること
export const THEME_BUCKET = 'theme-images';

const THEME_COLUMNS = 'id, title, image_path, starts_at, post_window_minutes';

// 開始日時を過ぎたお題のうち、いちばん新しいもの(=今回のお題)を返す。なければnull
export async function fetchCurrentTheme() {
  const { data, error } = await supabase
    .from('themes')
    .select(THEME_COLUMNS)
    .lte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// 開始日時を過ぎたお題を新しい順に返す(先頭が今回のお題、以降が過去のお題)
export async function fetchThemes(limit = 10) {
  const { data, error } = await supabase
    .from('themes')
    .select(THEME_COLUMNS)
    .lte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

// 投稿の締切日時を返す。post_window_minutes が未設定ならnull
export function getPostDeadline(theme) {
  if (!theme.post_window_minutes) return null;
  return new Date(new Date(theme.starts_at).getTime() + theme.post_window_minutes * 60 * 1000);
}

export function getThemeImageUrl(path) {
  return supabase.storage.from(THEME_BUCKET).getPublicUrl(path).data.publicUrl;
}