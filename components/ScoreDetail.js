import { WEIGHTS } from '@/lib/scoring';

// 表示の切り替え(ここの1行を書き換えるだけで表示が変わる)
//   'weighted' … A案: 各項目を配点ぶんの点数で表示(合計=得点)  例: 一致度 27 / 構図 22 / 完成度 17 / 速さ 20
//   'raw'      … 各項目を0〜100点のまま表示                    例: 一致度 90 / 構図 88 / 完成度 85 / 速さ 80
const DISPLAY_MODE = 'weighted';

// 内訳に出す項目(key は score_detail に保存されている名前)
// weight は lib/scoring.js の配点(WEIGHTS)の名前
// 速さは、一致度が低いと0になる「適用後の点」(speed_applied)を表示する
const ITEMS = [
  { key: 'match', label: '一致度', weight: 'match' },
  { key: 'composition', label: '構図', weight: 'composition' },
  { key: 'speed_applied', label: '速さ', weight: 'speed', fallback: 'speed' },
  { key: 'quality', label: '完成度', weight: 'quality' },
];

export default function ScoreDetail({ detail }) {
  if (!detail || typeof detail !== 'object') return null;

  const rows = ITEMS.map(({ key, label, weight, fallback }) => {
    const raw = detail[key] ?? (fallback ? detail[fallback] : undefined);
    if (raw == null || Number.isNaN(Number(raw))) return { label, value: null };
    const score = Number(raw); // 0〜100の元の点
    const value =
      DISPLAY_MODE === 'weighted'
        ? Math.round(score * WEIGHTS[weight]) // 配点ぶんの点(整数に四捨五入)
        : Math.round(score);
    return { label, value, percent: score };
  }).filter((r) => r.value != null);

  if (rows.length === 0) return null;

  return (
    <div className="score-detail">
      <ul className="score-detail__list">
        {rows.map((r) => (
          <li key={r.label} className="score-detail__row">
            <span className="score-detail__label">{r.label}</span>
            <span className="score-detail__bar" aria-hidden="true">
              <span
                className="score-detail__fill"
                style={{ width: `${Math.min(100, Math.max(0, r.percent))}%` }}
              />
            </span>
            <span className="score-detail__value">
              {r.value}
              <small>点</small>
            </span>
          </li>
        ))}
      </ul>
      {detail.flagged && (
        <p className="score-detail__note">不適切な内容と判定されたため、0点になりました。</p>
      )}
      {detail.comment && <p className="score-detail__comment">{detail.comment}</p>}
    </div>
  );
}