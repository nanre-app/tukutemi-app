'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AFTER_LOGIN_KEY = 'tukutemi:afterLogin';

// 自分のサイト内のパスだけを許可する(外部サイトへの飛ばし先にされないため)
function safePath(value) {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  if (value.startsWith('/login')) return null;
  return value;
}

export default function LoginPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleGoogleLogin() {
    setBusy(true);
    setError('');

    // ログイン後に戻るページを覚えておく(?next=/post のような形で渡される)
    try {
      const next = safePath(new URLSearchParams(window.location.search).get('next'));
      if (next) {
        sessionStorage.setItem(AFTER_LOGIN_KEY, next);
      } else {
        sessionStorage.removeItem(AFTER_LOGIN_KEY);
      }
    } catch (storageError) {
      console.error(storageError);
    }

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        // ログインのたびにGoogleのアカウント選択画面を出す
        queryParams: { prompt: 'select_account' },
      },
    });
    if (signInError) {
      setError('ログインに失敗しました。時間をおいてもう一度お試しください。');
      setBusy(false);
    }
    // 成功時はGoogleの認証画面にリダイレクトされるので、ここでは何もない
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