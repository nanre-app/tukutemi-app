'use client';

import { useEffect } from 'react';

// 右クリック・長押しメニュー・ドラッグ保存を、画像まわりで無効にする
const PROTECTED = 'img, .theme__frame, .slot__frame, .ranking__row, .grid__item, .preview';

export default function ImageGuard() {
  useEffect(() => {
    function block(e) {
      if (e.target instanceof Element && e.target.closest(PROTECTED)) {
        e.preventDefault();
      }
    }
    document.addEventListener('contextmenu', block);
    document.addEventListener('dragstart', block);
    return () => {
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('dragstart', block);
    };
  }, []);

  return null;
}