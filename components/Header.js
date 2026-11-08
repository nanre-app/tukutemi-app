'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const AFTER_LOGIN_KEY = 'tukutemi:afterLogin';

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // ログイン直後に、ログイン前に開いていたページへ移動する
    function goBackAfterLogin(session) {
      if (!session) return;
      try {
        const next = sessionStorage.getItem(AFTER_LOGIN_KEY);
        if (!next) return;
        sessionStorage.removeItem(AFTER_LOGIN_KEY); // 1回だけ使う
        if (next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/login')) {
          router.replace(next);
        }
      } catch (storageError) {
        console.error(storageError);
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
      goBackAfterLogin(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      goBackAfterLogin(session);
    });

    return () => listener.subscription.unsubscribe();
  }, [router]);

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