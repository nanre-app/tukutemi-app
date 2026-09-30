'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, IMAGE_BUCKET } from '@/lib/supabaseClient';
import { fetchCurrentTheme, getPostDeadline } from '@/lib/themes';

const MAX_BYTES = 5 * 1024 * 1024; // 5MB(supabase/schema.sql の設定と揃える)
const EXTENSIONS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

// 残りミリ秒を「1時間 05分 09秒」の形にする
function formatRemaining(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}時間 ${mm}分 ${ss}秒` : `${m}分 ${ss}秒`;
}

export default function PostPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(null);
  const [checking, setChecking] = useState(true);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // 締切日時(お題に締切がなければ null)
  const deadline = useMemo(() => (theme ? getPostDeadline(theme) : null), [theme]);
  const remaining = deadline ? deadline.getTime() - now : null;
  const closed = remaining !== null && remaining <= 0;

  // 未ログインならログインページへ移動し、ログイン済みなら今回のお題を取得する
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace('/login');
        return;
      }

      try {
        const current = await fetchCurrentTheme();
        if (cancelled) return;
        setTheme(current);
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) setError('お題を読み込めませんでした。時間をおいて、ページを再読み込みしてください。');
      }

      if (cancelled) return;
      setUser(data.session.user);
      setChecking(false);
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // 締切があるお題のあいだ、1秒ごとに現在時刻を更新する
  useEffect(() => {
    if (!deadline || closed) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [deadline, closed]);

  // 選んだ画像のプレビューを作る
  useEffect(() => {
    if (!file) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleFileChange(event) {
    const selected = event.target.files?.[0] ?? null;
    setError('');

    if (!selected) {
      setFile(null);
      return;
    }
    if (!EXTENSIONS[selected.type]) {
      setFile(null);
      setError('PNG・JPEG・WebP の画像を選んでください。');
      return;
    }
    if (selected.size > MAX_BYTES) {
      setFile(null);
      setError('画像のサイズは5MB以下にしてください。');
      return;
    }
    setFile(selected);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || !user || !theme) return;

    // 送る直前にも締切を確認する(最終的な判定はSupabase側のトリガーが行う)
    if (deadline && Date.now() >= deadline.getTime()) {
      setNow(Date.now());
      setError('このお題の投稿は締め切られました。');
      return;
    }

    setBusy(true);
    setError('');

    // 自分のユーザーIDのフォルダに保存する(Storage のアクセス制限と対応)
    const path = `${user.id}/${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;

    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, file, { contentType: file.type, cacheControl: '31536000' });

    if (uploadError) {
      console.error(uploadError);
      setError('画像をアップロードできませんでした。時間をおいて、もう一度お試しください。');
      setBusy(false);
      return;
    }

    const { error: insertError } = await supabase
      .from('posts')
      .insert({ user_id: user.id, theme_id: theme.id, image_path: path });

    if (insertError) {
      console.error(insertError);
      // 記録に失敗したときは、アップロード済みの画像を消しておく
      await supabase.storage.from(IMAGE_BUCKET).remove([path]);
      if (deadline && Date.now() >= deadline.getTime()) {
        setNow(Date.now());
        setError('このお題の投稿は締め切られました。');
      } else {
        setError('投稿を保存できませんでした。時間をおいて、もう一度お試しください。');
      }
      setBusy(false);
      return;
    }

    router.push('/');
  }

  if (checking) {
    return <p className="muted">ログイン状態を確認しています…</p>;
  }

  return (
    <div className="card card--wide">
      <h1 className="card__title">作品を投稿する</h1>
      {theme ? (
        <p className="muted">
          今回のお題「{theme.title}」をもとに生成AIでつくった画像を選んでください(PNG・JPEG・WebP、5MBまで)。
        </p>
      ) : (
        <p className="muted">今回のお題はまだありません。次のお題が始まってから投稿してください。</p>
      )}

      {deadline && (
        <p className={closed ? 'countdown countdown--closed' : 'countdown'} role="status">
          {closed
            ? 'このお題の投稿は締め切られました。'
            : `投稿の締切まで あと ${formatRemaining(remaining)}`}
        </p>
      )}

      <form onSubmit={handleSubmit} className="form">
        <label className="field">
          <span className="field__label">画像ファイル</span>
          <input
            className="field__input"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            disabled={closed}
          />
        </label>

        {preview && <img className="preview" src={preview} alt="選んだ画像のプレビュー" />}

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="button button--wide"
          disabled={!file || !theme || busy || closed}
        >
          {busy ? '投稿中…' : '投稿する'}
        </button>
      </form>
    </div>
  );
}