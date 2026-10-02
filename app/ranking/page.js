'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchCurrentTheme } from '@/lib/themes';

export default function RankingRedirectPage() {
  const router = useRouter();
  const [status, setStatus] = useState('loading'); // loading | empty | error

  useEffect(() => {
    let cancelled = false;

    async function go() {
      try {
        const theme = await fetchCurrentTheme();
        if (cancelled) return;

        if (!theme) {
          setStatus('empty');
          return;
        }
        // 戻るボタンで /ranking に戻って無限に転送されないよう replace を使う
        router.replace(`/theme/${theme.id}`);
      } catch (e) {
        console.error(e);
        if (!cancelled) setStatus('error');
      }
    }

    go();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="container">
      {status === 'loading' && <p className="muted">ランキングを開いています…</p>}

      {status === 'empty' && (
        <p className="empty">
          まだお題がありません。
          <br />
          <Link href="/">トップへ戻る</Link>
        </p>
      )}

      {status === 'error' && (
        <p className="error" role="alert">
          ランキングを開けませんでした。時間をおいて、ページを再読み込みしてください。
        </p>
      )}
    </div>
  );
}