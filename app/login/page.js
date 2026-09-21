'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

function toJapaneseError(error) {
  const message = error?.message ?? '';
  if (message.includes('Invalid login credentials')) {
    return 'メールアドレスまたはパスワードが正しくありません。';
  }
  if (message.includes('Email not confirmed')) {
    return 'メールアドレスの確認が済んでいません。届いた確認メールのリンクを開いてください。';
  }
  if (message.includes('User already registered')) {
    return 'このメールアドレスはすでに登録されています。ログインしてください。';
  }
  if (message.includes('at least')) {
    return 'パスワードは6文字以上で入力してください。';
  }
  return `エラーが発生しました: ${message}`;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login'); // login | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const isLogin = mode === 'login';

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');

    if (isLogin) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(toJapaneseError(signInError));
      } else {
        router.push('/');
      }
    } else {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (signUpError) {
        setError(toJapaneseError(signUpError));
      } else if (data.session) {
        // メール確認が不要な設定のときは、そのままログイン状態になる
        router.push('/');
      } else {
        setNotice('確認メールを送信しました。メール内のリンクを開いてから、ログインしてください。');
      }
    }

    setBusy(false);
  }

  function switchMode() {
    setMode(isLogin ? 'signup' : 'login');
    setError('');
    setNotice('');
  }

  return (
    <div className="card">
      <h1 className="card__title">{isLogin ? 'ログイン' : '新規登録'}</h1>

      <form onSubmit={handleSubmit} className="form">
        <label className="field">
          <span className="field__label">メールアドレス</span>
          <input
            className="field__input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">パスワード(6文字以上)</span>
          <input
            className="field__input"
            type="password"
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}

        <button type="submit" className="button button--wide" disabled={busy}>
          {busy ? '送信中…' : isLogin ? 'ログインする' : '登録する'}
        </button>
      </form>

      <p className="card__switch">
        {isLogin ? 'アカウントがまだない場合は' : 'すでにアカウントがある場合は'}
        <button type="button" className="link-button" onClick={switchMode}>
          {isLogin ? '新規登録' : 'ログイン'}
        </button>
        へ。
      </p>
    </div>
  );
}
