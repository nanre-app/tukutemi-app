import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase の環境変数が未設定です。NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください(ローカルは .env.local、本番は Vercel の Environment Variables)。'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 画像を保存しているバケット名(supabase/schema.sql と揃える)
export const IMAGE_BUCKET = 'post-images';

// 保存パスから、画面に表示できる公開URLを作る
export function getImageUrl(path) {
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}
