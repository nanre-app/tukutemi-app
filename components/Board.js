'use client';

import { useEffect, useState } from 'react';
import ThemeBox from '@/components/ThemeBox';
import { fetchThemes } from '@/lib/themes';

export default function Board() {
  const [themes, setThemes] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let cancelled = false;

    fetchThemes()
      .then((data) => {
        if (cancelled) return;
        setThemes(data);
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
        画像を読み込めませんでした。時間をおいて、ページを再読み込みしてください。
      </p>
    );
  }

  if (themes.length === 0) {
    return (
      <div className="empty">
        <p>今回のお題はまだありません。次のお題が始まるまで、しばらくお待ちください。</p>
      </div>
    );
  }

  return (
    <div>
      {themes.map((theme, index) => (
        <ThemeBox key={theme.id} theme={theme} isLatest={index === 0} />
      ))}
    </div>
  );
}