'use client';

import PostList from '@/components/PostList';
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
      <div className="board">
        {/* 左: お題の画像 */}
        <section className="theme" aria-labelledby={`theme-title-${theme.id}`}>
          <h2 id={`theme-title-${theme.id}`} className="theme__title">
            {isLatest ? '今回のお題' : '過去のお題'}
          </h2>
          <div className="theme__frame">
            <img
              className="theme__image"
              src={getThemeImageUrl(theme.image_path)}
              alt={`お題: ${theme.title}`}
            />
          </div>
          <p className="theme__name">{theme.title}</p>
          {deadlineText && (
            <p className="theme__deadline">
              {isOpen ? `投稿受付中(締切 ${deadlineText})` : `投稿は締め切りました(${deadlineText})`}
            </p>
          )}
        </section>

        {/* 右: このお題の投稿(4件まで) */}
        <section aria-label="みんなの作品">
          <PostList
            themeId={theme.id}
            limit={4}
            moreHref={`/theme/${theme.id}`}
            canPost={isOpen}
          />
        </section>
      </div>
    </article>
  );
}