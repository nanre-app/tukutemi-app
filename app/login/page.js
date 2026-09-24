'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleGoogleLogin() {
    setBusy(true);
    setError('');
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (signInError) {
      setError('ログインに失敗しました。時間をおいてもう一度お試しください。');
      setBusy(false);
    }
    // 成功時はGoogleの認証画面にリダイレクトされるので、ここでは何もしない
  }

  return (
    <div className="card">
      <h1 className="card__title">ログイン</h1>
      <p className="card__hint">Googleアカウントでログインしてください。</p>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        className="button button--wide"
        onClick={handleGoogleLogin}
        disabled={busy}
      >
        {busy ? 'リダイレクト中…' : 'Googleでログイン'}
      </button>
    </div>
  );
}