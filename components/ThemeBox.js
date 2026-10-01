'use client';

import RankingGrid from '@/components/RankingGrid';
import { getThemeImageUrl, getPostDeadline } from '@/lib/themes';

export default function ThemeBox({ theme, isLatest }) {
  const deadline = getPostDeadline(theme);
  const isOpen = isLatest && (deadline === null || new Date() < deadline);

  const deadlineText = deadline
    ? deadline.toLocaleString('ja-JP', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <article className="theme-box">
      <div className="theme-grid">
        {/* お題画像 */}
        <section className="theme-grid__theme">
          <div className="theme__frame">
            <img
              className="theme__image"
              src={getThemeImageUrl(theme.image_path)}
              alt={`お題: ${theme.title}`}
            />
            <span className="badge">{isLatest ? '今回のお題' : '過去のお題'}</span>
          </div>
          <h2 className="theme__name">{theme.title}</h2>
          {deadlineText && (
            <p className="theme__deadline">
              {isOpen ? `投稿受付中(締切 ${deadlineText})` : `投稿は締め切りました(${deadlineText})`}
            </p>
          )}
        </section>

        {/* 1〜3位の投稿・説明欄・広告欄 */}
        <RankingGrid themeId={theme.id} moreHref={`/theme/${theme.id}`} canPost={isOpen} />
      </div>
    </article>
  );
}