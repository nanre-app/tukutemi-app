'use client';

import Link from 'next/link';
import { Fragment, useEffect, useState } from 'react';
import { supabase, getImageUrl } from '@/lib/supabaseClient';

const SHOW_COUNT = 3; // 1〜3位まで表示
const MAX_SCORE = 1000; // 仮の満点
const RANKS = [1, 2, 3];

function formatDateTime(value) {
  return new Date(value).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Avatar({ profile }) {
  if (profile?.avatar_url) {
    return <img className="avatar" src={profile.avatar_url} alt="" />;
  }
  const initial = (profile?.username ?? 'ユ').charAt(0);
  return (
    <span className="avatar avatar--blank" aria-hidden="true">
      {initial}
    </span>
  );
}

export default function RankingGrid({ themeId, moreHref, canPost = true }) {
  const [posts, setPosts] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 得点が高い順(得点なしは後ろ)。同点なら先に投稿した方が上。「もっと見る」判定のため1件多く取る
      const { data, error } = await supabase
        .from('posts')
        .select('id, user_id, image_path, created_at, score')
        .eq('theme_id', themeId)
        .order('score', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: true })
        .limit(SHOW_COUNT + 1);

      if (cancelled) return;

      if (error) {
        console.error(error);
        setStatus('error');
        return;
      }

      const shown = data.slice(0, SHOW_COUNT);
      const userIds = [...new Set(shown.map((p) => p.user_id))];
      let profileMap = {};

      if (userIds.length > 0) {
        const { data: rows, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);
        if (profileError) {
          console.warn(profileError);
        } else {
          profileMap = Object.fromEntries(rows.map((r) => [r.id, r]));
        }
      }

      if (cancelled) return;
      setHasMore(data.length > SHOW_COUNT);
      setPosts(shown);
      setProfiles(profileMap);
      setStatus('ready');
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [themeId]);

  if (status === 'loading') {
    return <p className="muted theme-grid__full">読み込み中…</p>;
  }

  if (status === 'error') {
    return (
      <p className="error theme-grid__full" role="alert">
        作品を読み込めませんでした。時間をおいて、ページを再読み込みしてください。
      </p>
    );
  }

  return (
    <>
      {RANKS.map((rank, i) => {
        const post = posts[i];
        const profile = post ? profiles[post.user_id] : null;
        const name = profile?.username ?? 'ユーザー';
        const first = rank === 1;
        const scoreText =
          post && post.score != null ? `${Number(post.score)} / ${MAX_SCORE}点` : '未採点';

        return (
          <Fragment key={rank}>
            {/* 投稿画像 */}
            <div className={`slot${first ? ' slot--first' : ''}`}>
              <div className="slot__frame">
                {post ? (
                  <img
                    className="slot__image"
                    src={getImageUrl(post.image_path)}
                    alt={`${rank}位の作品`}
                    loading="lazy"
                  />
                ) : (
                  <div className="slot__empty">まだありません</div>
                )}
                <span className="badge">{rank}位</span>
              </div>
            </div>

            {/* 説明欄 */}
            <div className={`slot info${first ? ' slot--first' : ''}`}>
              {post ? (
                <>
                  <div className="info__user">
                    <Avatar profile={profile} />
                    <span className="info__name">{name}</span>
                  </div>
                  <p className="info__line">得点:{scoreText}</p>
                  <p className="info__line">日時:{formatDateTime(post.created_at)}</p>
                  {/* 将来、いいねボタン等を入れるための空きスペース */}
                  {first && <div className="info__reserve" aria-hidden="true" />}
                </>
              ) : first && canPost ? (
                <>
                  <p className="muted">まだ作品がありません。</p>
                  <Link href="/post" className="button">
                    投稿する
                  </Link>
                </>
              ) : (
                <p className="muted">投稿なし</p>
              )}
            </div>
          </Fragment>
        );
      })}

      {/* 将来の広告欄 */}
      <aside className="slot slot--ad ad" aria-label="広告欄">
        <span className="muted">広告欄(準備中)</span>
      </aside>

      {hasMore && moreHref && (
        <p className="more theme-grid__full">
          <Link href={moreHref}>もっと見る</Link>
        </p>
      )}
    </>
  );
}