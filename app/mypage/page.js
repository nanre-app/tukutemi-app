'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getImageUrl } from '@/lib/supabaseClient';
import { fetchCurrentTheme, getPostDeadline } from '@/lib/themes';

const MAX_SCORE = 1000;
const AVATAR_BUCKET = 'avatars';
const POST_BUCKET = 'post-images';
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const NAME_MAX = 20;

function formatDateTime(value) {
  return new Date(value).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// エラーの内容を画面に出すための文字列(原因調査用)
function errorDetail(error) {
  if (!error) return '';
  return `(${error.code ?? 'no-code'}: ${error.message ?? 'no-message'})`;
}

export default function MyPage() {
  const router = useRouter();
  const fileRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | guest | ready | error
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [themes, setThemes] = useState({});
  const [currentThemeId, setCurrentThemeId] = useState(null);

  const [nameInput, setNameInput] = useState('');
  const [message, setMessage] = useState(null); // { type: 'error' | 'notice', text }
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUser = sessionData.session?.user ?? null;

      if (cancelled) return;
      if (!currentUser) {
        setStatus('guest');
        return;
      }

      const [profileRes, postsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('id', currentUser.id)
          .maybeSingle(),
        supabase
          .from('posts')
          .select('id, theme_id, image_path, created_at, score')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      if (cancelled) return;

      if (postsRes.error) {
        console.error(postsRes.error);
        setStatus('error');
        return;
      }

      const myPosts = postsRes.data;
      const themeIds = [...new Set(myPosts.map((p) => p.theme_id))];
      let themeMap = {};

      if (themeIds.length > 0) {
        const { data: rows, error: themeError } = await supabase
          .from('themes')
          .select('id, title, starts_at, post_window_minutes')
          .in('id', themeIds);
        if (themeError) {
          console.warn(themeError);
        } else {
          themeMap = Object.fromEntries(rows.map((r) => [r.id, r]));
        }
      }

      // 今回のお題(削除できるのはこのお題への投稿だけ)
      let nowThemeId = null;
      try {
        const current = await fetchCurrentTheme();
        nowThemeId = current?.id ?? null;
      } catch (e) {
        console.warn(e);
      }

      if (cancelled) return;
      setUser(currentUser);
      setProfile(profileRes.data ?? null);
      setNameInput(profileRes.data?.username ?? '');
      setPosts(myPosts);
      setThemes(themeMap);
      setCurrentThemeId(nowThemeId);
      setStatus('ready');
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // 締切前の「今回のお題」への投稿だけ削除できる
  function canDelete(post) {
    const theme = themes[post.theme_id];
    if (!theme || post.theme_id !== currentThemeId) return false;
    const deadline = getPostDeadline(theme);
    return deadline === null || new Date() < deadline;
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  // ユーザー名の変更
  async function handleSaveName(e) {
    e.preventDefault();
    const next = nameInput.trim();

    if (next.length < 1 || next.length > NAME_MAX) {
      setMessage({ type: 'error', text: `ユーザー名は1〜${NAME_MAX}文字で入力してください。` });
      return;
    }
    if (next === profile?.username) {
      setMessage({ type: 'notice', text: '名前は変わっていません。' });
      return;
    }

    setBusy(true);
    setMessage(null);
    const { data, error } = await supabase
      .from('profiles')
      .update({ username: next })
      .eq('id', user.id)
      .select('id, username, avatar_url');
    setBusy(false);

    if (error) {
      console.error(error);
      setMessage({
        type: 'error',
        text:
          error.code === '23505'
            ? 'その名前はすでに使われています。別の名前にしてください。'
            : `名前を変更できませんでした。${errorDetail(error)}`,
      });
      return;
    }
    if (!data || data.length === 0) {
      setMessage({
        type: 'error',
        text: 'プロフィールの行が更新されませんでした(0件更新)。',
      });
      return;
    }

    setProfile(data[0]);
    setNameInput(data[0].username);
    setMessage({ type: 'notice', text: `ユーザー名を「${data[0].username}」に変更しました。` });
  }

  // アイコン画像の変更
  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!AVATAR_TYPES.includes(file.type)) {
      setMessage({ type: 'error', text: 'PNG・JPEG・WebP の画像を選んでください。' });
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setMessage({ type: 'error', text: '画像は2MB以下にしてください。' });
      return;
    }

    setBusy(true);
    setMessage(null);

    // 自分のフォルダの固定ファイル名に上書き保存する
    const path = `${user.id}/avatar`;
    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      console.error(uploadError);
      setBusy(false);
      setMessage({ type: 'error', text: '画像をアップロードできませんでした。' });
      return;
    }

    // 上書きしても古い画像が表示されないよう、URLに日時を付ける
    const url = `${supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;

    const { data, error } = await supabase
      .from('profiles')
      .update({ avatar_url: url })
      .eq('id', user.id)
      .select('id, username, avatar_url');
    setBusy(false);

    if (error || !data || data.length === 0) {
      console.error(error);
      setMessage({ type: 'error', text: 'アイコンを保存できませんでした。' });
      return;
    }

    setProfile(data[0]);
    setMessage({ type: 'notice', text: 'アイコンを変更しました。' });
  }

  // 投稿の削除(締切前だけ)
  async function handleDeletePost(post) {
    if (!canDelete(post)) {
      setMessage({ type: 'error', text: '締切後の投稿は削除できません。' });
      return;
    }

    const title = themes[post.theme_id]?.title ?? 'お題';
    if (!window.confirm(`お題「${title}」への投稿を削除します。元に戻せません。よろしいですか?`)) {
      return;
    }

    setBusy(true);
    setMessage(null);
    const { data, error } = await supabase
      .from('posts')
      .delete()
      .eq('id', post.id)
      .select('id');

    if (error) {
      console.error(error);
      setBusy(false);
      setMessage({ type: 'error', text: `投稿を削除できませんでした。${errorDetail(error)}` });
      return;
    }
    if (!data || data.length === 0) {
      setBusy(false);
      setMessage({ type: 'error', text: '締切後のため、投稿を削除できませんでした。' });
      return;
    }

    // 画像ファイルも削除(失敗しても投稿の削除は完了しているので続行)
    const { error: removeError } = await supabase.storage
      .from(POST_BUCKET)
      .remove([post.image_path]);
    if (removeError) console.warn(removeError);

    setBusy(false);
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    setMessage({ type: 'notice', text: '投稿を削除しました。' });
  }

  if (status === 'loading') {
    return (
      <div className="container">
        <p className="muted">読み込み中…</p>
      </div>
    );
  }

  if (status === 'guest') {
    return (
      <div className="container">
        <div className="card">
          <h1 className="card__title">マイページ</h1>
          <p>マイページを見るにはログインが必要です。</p>
          <Link href="/login" className="button button--wide">
            ログインする
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="container">
        <p className="error" role="alert">
          マイページを読み込めませんでした。時間をおいて、ページを再読み込みしてください。
        </p>
      </div>
    );
  }

  const name = profile?.username ?? 'ユーザー';

  return (
    <div className="container">
      <section className="mypage__profile">
        <div className="mypage__avatar-box">
          {profile?.avatar_url ? (
            <img className="avatar mypage__avatar" src={profile.avatar_url} alt="" />
          ) : (
            <span className="avatar avatar--blank mypage__avatar" aria-hidden="true">
              {name.charAt(0)}
            </span>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={handleAvatarChange}
          />
          <button
            type="button"
            className="link-button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            アイコン変更
          </button>
        </div>

        <div className="mypage__who">
          <form className="mypage__name-form" onSubmit={handleSaveName}>
            <label className="field__label" htmlFor="username">
              ユーザー名
            </label>
            <div className="mypage__name-row">
              <input
                id="username"
                className="field__input"
                value={nameInput}
                maxLength={NAME_MAX}
                onChange={(e) => setNameInput(e.target.value)}
              />
              <button type="submit" className="button" disabled={busy}>
                保存
              </button>
            </div>
          </form>
          <p className="muted mypage__email">{user.email}</p>
        </div>

        <button type="button" className="button button--ghost" onClick={handleLogout}>
          ログアウト
        </button>
      </section>

      {message && (
        <p className={message.type === 'error' ? 'error' : 'notice'} role="status">
          {message.text}
        </p>
      )}

      <h2 className="section-title">自分の投稿({posts.length}件)</h2>

      {posts.length === 0 ? (
        <p className="empty">
          まだ投稿がありません。
          <br />
          <Link href="/post">投稿する</Link>
        </p>
      ) : (
        <ul className="grid mypage__list">
          {posts.map((post) => (
            <li key={post.id} className="grid__item">
              <Link href={`/theme/${post.theme_id}`}>
                <img
                  className="grid__image"
                  src={getImageUrl(post.image_path)}
                  alt={`お題「${themes[post.theme_id]?.title ?? ''}」への投稿`}
                  loading="lazy"
                />
              </Link>
              <div className="mypage__meta">
                <p className="mypage__theme">{themes[post.theme_id]?.title ?? 'お題'}</p>
                <p className="mypage__score">
                  {post.score != null ? `${Number(post.score)} / ${MAX_SCORE}点` : '未採点'}
                </p>
              </div>
              <div className="mypage__foot">
                <span className="grid__date">{formatDateTime(post.created_at)}</span>
                {canDelete(post) ? (
                  <button
                    type="button"
                    className="link-button mypage__delete"
                    disabled={busy}
                    onClick={() => handleDeletePost(post)}
                  >
                    削除
                  </button>
                ) : (
                  <span className="muted mypage__locked">削除不可(締切後)</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}