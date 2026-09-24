'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  return (
    <header className="site-header">
      <Link href="/" className="site-header__logo">
        tukutemi
      </Link>

      <nav className="site-header__nav" aria-label="メインメニュー">
        {ready && user && (
          <>
            <span className="site-header__user" title={user.email}>
              {user.email}
            </span>
            <Link href="/post" className="button">
              投稿する
            </Link>
            <button type="button" className="button button--ghost" onClick={handleLogout}>
              ログアウト
            </button>
          </>
        )}
        {ready && !user && (
          <Link href="/login" className="button">
            ログイン
          </Link>
        )}
      </nav>
    </header>
  );
}