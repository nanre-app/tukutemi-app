import { COMPOSITION_CAP_MAX } from '@/lib/scoring';

// 内訳に出す項目(key は score_detail に保存されている名前)
// 速さは、一致度が低いと0になる「適用後の点」(speed_applied)を表示する
const ITEMS = [
  { key: 'match', label: '一致度' },
  { key: 'composition', label: '構図' },
  { key: 'speed_applied', label: '速さ', fallback: 'speed' },
  { key: 'quality', label: '完成度' },
];

export default function ScoreDetail({ detail }) {
  if (!detail || typeof detail !== 'object') return null;

  const rows = ITEMS.map(({ key, label, fallback }) => {
    const raw = detail[key] ?? (fallback ? detail[fallback] : undefined);
    return { label, value: raw == null ? null : Math.round(Number(raw)) };
  }).filter((r) => r.value != null && !Number.isNaN(r.value));

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
                style={{ width: `${Math.min(100, Math.max(0, r.value))}%` }}
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
      {detail.capped && (
        <p className="score-detail__note">
          構図の点が低いため、合計は{COMPOSITION_CAP_MAX}点が上限になりました。
        </p>
      )}
      {detail.comment && <p className="score-detail__comment">{detail.comment}</p>}
    </div>
  );
}