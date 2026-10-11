'use client';

import { useEffect, useState } from 'react';
import { supabase, getImageUrl } from '@/lib/supabaseClient';

const START_YEAR = 2026; // サービス開始年
const LIMIT = 100; // 表示する最大人数
const PAGE = 1000; // Supabaseは1回に最大1000行までなので分けて取得する

// 日本時間の「今年」
function getCurrentYearJst() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCFullYear();
}

// 日本時間の year 年 1/1 0:00 をUTCのISO文字列にする
function jstYearStart(year) {
  return new Date(Date.UTC(year, 0, 1) - 9 * 60 * 60 * 1000).toISOString();
}

async function fetchYearPosts(year) {
  const from = jstYearStart(year);
  const to = jstYearStart(year + 1);
  const rows = [];

  for (let start = 0; ; start += PAGE) {
    const { data, error } = await supabase
      .from('posts')
      .select('id, user_id, image_path, created_at, score')
      .not('score', 'is', null)
      .gte('created_at', from)
      .lt('created_at', to)
      .order('created_at', { ascending: true })
      .range(start, start + PAGE - 1);

    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

// ユーザーごとに合計点を出し、合計が高い順(同点なら先に投稿した人が上)に並べる
function aggregate(posts) {
  const map = new Map();

  for (const p of posts) {
    const score = Number(p.score);
    const cur = map.get(p.user_id);
    if (!cur) {
      map.set(p.user_id, {
        userId: p.user_id,
        total: score,
        count: 1,
        best: p,
        bestScore: score,
        firstAt: p.created_at,
      });
    } else {
      cur.total += score;
      cur.count += 1;
      if (score > cur.bestScore) {
        cur.best = p;
        cur.bestScore = score;
      }
    }
  }

  return [...map.values()]
    .sort((a, b) => b.total - a.total || new Date(a.firstAt) - new Date(b.firstAt))
    .slice(0, LIMIT);
}

export default function AnnualRankingList() {
  const currentYear = getCurrentYearJst();
  const years = [];
  for (let y = currentYear; y >= START_YEAR; y--) years.push(y);

  const [year, setYear] = useState(currentYear);
  const [rows, setRows] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    async function load() {
      try {
        const posts = await fetchYearPosts(year);
        const ranked = aggregate(posts);

        const userIds = ranked.map((r) => r.userId);
        let profileMap = {};

        if (userIds.length > 0) {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', userIds);
          if (error) {
            console.warn(error);
          } else {
            profileMap = Object.fromEntries(data.map((r) => [r.id, r]));
          }
        }

        if (cancelled) return;
        setRows(ranked);
        setProfiles(profileMap);
        setStatus('ready');
      } catch (e) {
        console.error(e);
        if (!cancelled) setStatus('error');
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [year]);

  return (
    <div>
      <p>
        <label>
          集計する年：{' '}
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}年
              </option>
            ))}
          </select>
        </label>
        <span className="muted"> ※ 1年間の合計点(1/1〜12/31、日本時間)</span>
      </p>

      {status === 'loading' && <p className="muted">読み込み中…</p>}

      {status === 'error' && (
        <p className="error" role="alert">
          年間ランキングを読み込めませんでした。時間をおいて、ページを再読み込みしてください。
        </p>
      )}

      {status === 'ready' && rows.length === 0 && (
        <p className="empty">{year}年はまだ採点済みの投稿がありません。</p>
      )}

      {status === 'ready' && rows.length > 0 && (
        <ol className="ranking">
          {rows.map((r, i) => {
            const rank = i + 1;
            const name = profiles[r.userId]?.username ?? 'ユーザー';

            return (
              <li
                key={r.userId}
                className={`ranking__row${rank === 1 ? ' ranking__row--first' : ''}`}
              >
                <span className="ranking__rank">{rank}</span>
                <img
                  className="ranking__thumb"
                  src={getImageUrl(r.best.image_path)}
                  alt={`${rank}位の代表作品`}
                  loading="lazy"
                />
                <span className="ranking__name">{name}</span>
                <span className="ranking__score">
                  {r.total}
                  <small> 点({r.count}投稿)</small>
                </span>
                {/* 将来、いいねボタンを入れるための空きスペース */}
                <span className="ranking__like" aria-hidden="true" />
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}