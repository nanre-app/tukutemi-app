'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getImageUrl } from '@/lib/supabaseClient';

const MAX_SCORE = 1000;

function formatDateTime(value) {
  return new Date(value).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MyPage() {
  const router = useRouter();
  const [status, setStatus] = useState('loading'); // loading | guest | ready | error
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [themes, setThemes] = useState({});

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
          .select('id, title')
          .in('id', themeIds);
        if (themeError) {
          console.warn(themeError);
        } else {
          themeMap = Object.fromEntries(rows.map((r) => [r.id, r]));
        }
      }

      if (cancelled) return;
      setUser(currentUser);
      setProfile(profileRes.data ?? null);
      setPosts(myPosts);
      setThemes(themeMap);
      setStatus('ready');
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
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
        {profile?.avatar_url ? (
          <img className="avatar mypage__avatar" src={profile.avatar_url} alt="" />
        ) : (
          <span className="avatar avatar--blank mypage__avatar" aria-hidden="true">
            {name.charAt(0)}
          </span>
        )}
        <div className="mypage__who">
          <h1 className="mypage__name">{name}</h1>
          <p className="muted mypage__email">{user.email}</p>
        </div>
        <button type="button" className="button button--ghost" onClick={handleLogout}>
          ログアウト
        </button>
      </section>

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
              <p className="grid__date">{formatDateTime(post.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}