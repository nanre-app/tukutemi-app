'use client';

import { useEffect, useState } from 'react';
import PostList from '@/components/PostList';
import { fetchCurrentTheme, getThemeImageUrl } from '@/lib/themes';

export default function Board() {
  const [theme, setTheme] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let cancelled = false;

    fetchCurrentTheme()
      .then((data) => {
        if (cancelled) return;
        setTheme(data);
        setStatus('ready');
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'loading') {
    return <p className="muted">読み込み中…</p>;
  }

  if (status === 'error') {
    return (
      <p className="error" role="alert">
        お題を読み込めませんでした。時間をおいて、ページを再読み込みしてください。
      </p>
    );
  }

  if (!theme) {
    return (
      <div className="empty">
        <p>今回のお題はまだありません。次のお題が始まるまで、しばらくお待ちください。</p>
      </div>
    );
  }

  return (
    <div className="board">
      {/* 左: 今回のお題の画像 */}
      <section className="theme" aria-labelledby="theme-title">
        <h1 id="theme-title" className="theme__title">
          今回のお題
        </h1>
        <div className="theme__frame">
          <img
            className="theme__image"
            src={getThemeImageUrl(theme.image_path)}
            alt={`今回のお題: ${theme.title}`}
          />
        </div>
        <p className="theme__name">{theme.title}</p>
        <p className="theme__hint">このお題をもとに、生成AIで画像をつくって投稿しましょう。</p>
      </section>

      {/* 右: このお題に投稿された画像の一覧 */}
      <section aria-labelledby="posts-title">
        <h2 id="posts-title" className="section-title">
          みんなの作品
        </h2>
        <PostList themeId={theme.id} />
      </section>
    </div>
  );
}
