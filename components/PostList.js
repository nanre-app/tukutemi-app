'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase, getImageUrl } from '@/lib/supabaseClient';

const DEFAULT_LIMIT = 60;

export default function PostList({ themeId, limit = DEFAULT_LIMIT, moreHref, canPost = true }) {
  const [posts, setPosts] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 「もっと見る」を出すか判断するため、1件多く取得する
      const { data, error } = await supabase
        .from('posts')
        .select('id, image_path, created_at')
        .eq('theme_id', themeId)
        .order('created_at', { ascending: false })
        .limit(limit + 1);

      if (cancelled) return;

      if (error) {
        console.error(error);
        setStatus('error');
        return;
      }
      setHasMore(data.length > limit);
      setPosts(data.slice(0, limit));
      setStatus('ready');
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [themeId, limit]);

  if (status === 'loading') {
    return <p className="muted">読み込み中…</p>;
  }

  if (status === 'error') {
    return (
      <p className="error" role="alert">
        作品を読み込めませんでした。時間をおいて、ページを再読み込みしてください。
      </p>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="empty">
        {canPost ? (
          <>
            <p>まだ作品がありません。最初の1枚を投稿しましょう。</p>
            <Link href="/post" className="button">
              投稿する
            </Link>
          </>
        ) : (
          <p>このお題への作品はありません。</p>
        )}
      </div>
    );
  }

  return (
    <>
      <ul className="grid">
        {posts.map((post) => (
          <li key={post.id} className="grid__item">
            <img
              className="grid__image"
              src={getImageUrl(post.image_path)}
              alt="投稿された作品"
              loading="lazy"
            />
            <p className="grid__date">{new Date(post.created_at).toLocaleDateString('ja-JP')}</p>
          </li>
        ))}
      </ul>
      {hasMore && moreHref && (
        <p className="more">
          <Link href={moreHref}>もっと見る</Link>
        </p>
      )}
    </>
  );
}