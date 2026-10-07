'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/', label: 'HOME' },
  { href: '/ranking', label: 'ランキング' },
  { href: '/mypage', label: 'マイページ' },
];

export default function NavDrawer() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // ページを移動したら閉じる
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escキーで閉じる
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      {/* PC表示のハンバーガーボタン(スマホでは非表示) */}
      <button
        type="button"
        className="hamburger"
        aria-label={open ? 'メニューを閉じる' : 'メニューを開く'}
        aria-expanded={open}
        aria-controls="main-nav"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="hamburger__bar" />
        <span className="hamburger__bar" />
        <span className="hamburger__bar" />
      </button>

      {/* メニューの外側を押したら閉じる */}
      {open && <div className="drawer__backdrop" onClick={() => setOpen(false)} />}

      <nav id="main-nav" className={`drawer${open ? ' drawer--open' : ''}`} aria-label="メインメニュー">
        <ul className="drawer__menu">
          {ITEMS.map((item) => (
            <li key={item.href}>
              <Link className="drawer__link" href={item.href} onClick={() => setOpen(false)}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}