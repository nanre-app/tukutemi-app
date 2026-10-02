'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getThemeImageUrl } from '@/lib/themes';
import RankingList from '@/components/RankingList';

export default function ThemeRankingPage() {
  const { id } = useParams();
  const [theme, setTheme] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | notfound | error

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from('themes')
        .select('id, title, image_path')
        .eq('id', id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error(error);
        setStatus('error');
        return;
      }
      if (!data) {
        setStatus('notfound');
        return;
      }
      setTheme(data);
      setStatus('ready');
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="container">
      <p>
        <Link href="/">← トップへ戻る</Link>
      </p>

      {status === 'loading' && <p className="muted">読み込み中…</p>}

      {status === 'error' && (
        <p className="error" role="alert">
          お題を読み込めませんでした。時間をおいて、ページを再読み込みしてください。
        </p>
      )}

      {status === 'notfound' && <p className="empty">このお題は見つかりませんでした。</p>}

      {status === 'ready' && (
        <>
          <section className="ranking-page__theme">
            <div className="theme__frame">
              <img
                className="theme__image"
                src={getThemeImageUrl(theme.image_path)}
                alt={`お題: ${theme.title}`}
              />
            </div>
            <h1 className="ranking-page__title">{theme.title}</h1>
          </section>

          <RankingList themeId={theme.id} />
        </>
      )}
    </div>
  );
}