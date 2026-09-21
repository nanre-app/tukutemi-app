import { supabase } from '@/lib/supabaseClient';

// お題画像を保存しているバケット名(supabase/schema.sql と揃える)
export const THEME_BUCKET = 'theme-images';

// 開始日時を過ぎたお題のうち、いちばん新しいもの(=今回のお題)を返す。なければ null
export async function fetchCurrentTheme() {
  const { data, error } = await supabase
    .from('themes')
    .select('id, title, image_path, starts_at')
    .lte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export function getThemeImageUrl(path) {
  return supabase.storage.from(THEME_BUCKET).getPublicUrl(path).data.publicUrl;
}
