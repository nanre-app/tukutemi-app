'use client';

import Link from 'next/link';
import { useState } from 'react';

const MENU = [
  { href: '/', label: 'HOME' },
  { href: '/ranking', label: 'ランキング' },
  { href: '/mypage', label: 'マイページ' },
];

export default function NavDrawer() {
  const [open, setOpen] = useState(false);

  // マウスのときだけ「乗せると開く」。スマホのタップはボタンで開閉する
  const handleEnter = (e) => {
    if (e.pointerType === 'mouse') setOpen(true);
  };
  const handleLeave = (e) => {
    if (e.pointerType === 'mouse') setOpen(false);
  };

  return (
    <nav
      className={`drawer${open ? ' drawer--open' : ''}`}
      aria-label="メインメニュー"
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false);
      }}
    >
      <button
        type="button"
        className="drawer__handle"
        aria-expanded={open}
        aria-controls="drawer-menu"
        onClick={() => setOpen((v) => !v)}
      >
        メニュー
      </button>
      <ul id="drawer-menu" className="drawer__menu">
        {MENU.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="drawer__link" onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}