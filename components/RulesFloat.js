'use client';

import { useEffect, useState } from 'react';

// 画面の右下に浮かぶ「?」ボタン。押すと「投稿・採点のルール」がフロート表示される。
export default function RulesFloat() {
  const [open, setOpen] = useState(false);

  // Esc キーで閉じる
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="rules-fab"
        onClick={() => setOpen(true)}
        aria-label="投稿・採点のルールを見る"
      >
        ルール
      </button>

      {open && (
        <div className="rules-backdrop" onClick={() => setOpen(false)}>
          <div
            className="rules-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rules-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rules-panel__head">
              <h2 id="rules-title" className="rules-panel__title">
                投稿・採点のルール
              </h2>
              <button
                type="button"
                className="rules-panel__close"
                onClick={() => setOpen(false)}
                aria-label="閉じる"
              >
                ×
              </button>
            </div>

            <div className="rules-panel__body">
              <h3 className="rules-panel__sub">投稿のルール</h3>
              <ul className="rules-panel__list">
                <li>お題の画像を見て、生成AIで作った画像を投稿します。</li>
                <li>投稿は、1人につき1つのお題あたり1枚までです。</li>
                <li>
                  投稿し直したいときは、マイページで前の投稿を削除してから、もう一度投稿してください。
                </li>
                <li>投稿できるのは、お題ごとの締切までです。</li>
              </ul>

              <h3 className="rules-panel__sub">採点のルール</h3>
              <p className="rules-panel__text">
                投稿するとAIが自動で採点します。満点は100点です。
              </p>
              <ul className="rules-panel__list">
                <li>
                  <strong>一致度(30点)</strong>:お題の画像とどれだけ合っているか
                </li>
                <li>
                  <strong>構図(25点)</strong>:被写体の大きさ・アングルがお題と合っているか
                </li>
                <li>
                  <strong>速さ(25点)</strong>:早く投稿するほど高くなります
                </li>
                <li>
                  <strong>完成度(20点)</strong>:画像としての仕上がり
                </li>
              </ul>
              <p className="rules-panel__text">
                構図の点が低い(25点満点中10点未満の)ときは、合計が最大50点になります。
              </p>

              <h3 className="rules-panel__sub">点数の見え方</h3>
              <ul className="rules-panel__list">
                <li>1位の投稿は、項目ごとの点数と短評をみんなに公開します。</li>
                <li>自分の投稿の内訳は、マイページで自分だけが見られます。</li>
                <li>2位以下の内訳は、他の人には表示されません。</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}