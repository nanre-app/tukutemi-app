'use client';

import { useEffect, useState } from 'react';
import { supabase, getImageUrl } from '@/lib/supabaseClient';

const MAX_SCORE = 1000;
const LIMIT = 100;

export default function RankingList({ themeId }) {
  const [posts, setPosts] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 得点が高い順(得点なしは後ろ)。同点なら先に投稿した方が上
      const { data, error } = await supabase
        .from('posts')
        .select('id, user_id, image_path, created_at, score')
        .eq('theme_id', themeId)
        .order('score', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: true })
        .limit(LIMIT);

      if (cancelled) return;

      if (error) {
        console.error(error);
        setStatus('error');
        return;
      }

      const userIds = [...new Set(data.map((p) => p.user_id))];
      let profileMap = {};

      if (userIds.length > 0) {
        const { data: rows, error: profileError } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);
        if (profileError) {
          console.warn(profileError);
        } else {
          profileMap = Object.fromEntries(rows.map((r) => [r.id, r]));
        }
      }

      if (cancelled) return;
      setPosts(data);
      setProfiles(profileMap);
      setStatus('ready');
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [themeId]);

  if (status === 'loading') {
    return <p className="muted">読み込み中…</p>;
  }

  if (status === 'error') {
    return (
      <p className="error" role="alert">
        ランキングを読み込めませんでした。時間をおいて、ページを再読み込みしてください。
      </p>
    );
  }

  if (posts.length === 0) {
    return <p className="empty">まだ投稿がありません。</p>;
  }

  return (
    <ol className="ranking">
      {posts.map((post, i) => {
        const rank = i + 1;
        const name = profiles[post.user_id]?.username ?? 'ユーザー';
        const hasScore = post.score != null;

        return (
          <li key={post.id} className={`ranking__row${rank === 1 ? ' ranking__row--first' : ''}`}>
            <span className="ranking__rank">{rank}</span>
            <img
              className="ranking__thumb"
              src={getImageUrl(post.image_path)}
              alt={`${rank}位の作品`}
              loading="lazy"
            />
            <span className="ranking__name">{name}</span>
            <span className="ranking__score">
              {hasScore ? (
                <>
                  {Number(post.score)}
                  <small> / {MAX_SCORE}</small>
                </>
              ) : (
                <small>未採点</small>
              )}
            </span>
            {/* 将来、いいねボタンを入れるための空きスペース */}
            <span className="ranking__like" aria-hidden="true" />
          </li>
        );
      })}
    </ol>
  );
}