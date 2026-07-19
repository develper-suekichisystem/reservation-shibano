import { formatEventDate } from '../lib/format';
import type { EntryState } from '../types';

interface Props {
  state: EntryState;
  displayName: string;
  pictureUrl: string | null;
  onConfirm: () => void;
  onBack: () => void;
  submitting: boolean;
}

export function Confirmation({ state, displayName, pictureUrl, onConfirm, onBack, submitting }: Props) {
  const t = state.selectedTournament;

  return (
    <div className="confirmation">
      <h2 className="section-title">エントリー内容の確認</h2>

      <div className="confirm-card">
        <div className="confirm-row">
          <span className="confirm-label">大会名</span>
          <span className="confirm-value">{t?.name}</span>
        </div>
        <div className="confirm-row">
          <span className="confirm-label">年度</span>
          <span className="confirm-value">{t?.fiscal_year}年度</span>
        </div>
        <div className="confirm-row">
          <span className="confirm-label">開催日</span>
          <span className="confirm-value">{t && formatEventDate(t.event_date)}</span>
        </div>
        <div className="confirm-row">
          <span className="confirm-label">会場</span>
          <span className="confirm-value">{t?.venue}</span>
        </div>
        <div className="confirm-row">
          <span className="confirm-label">チーム名</span>
          <span className="confirm-value">{state.teamName}</span>
        </div>
        <div className="confirm-row">
          <span className="confirm-label">代表者名</span>
          <span className="confirm-value">{state.representativeName}</span>
        </div>
        <div className="confirm-row">
          <span className="confirm-label">電話番号</span>
          <span className="confirm-value">{state.phone}</span>
        </div>
        <div className="confirm-row">
          <span className="confirm-label">申込者</span>
          <span className="confirm-value confirm-value-profile">
            {pictureUrl && (
              <img src={pictureUrl} alt={displayName} className="confirm-avatar" />
            )}
            {displayName}
          </span>
        </div>
      </div>

      <p className="confirm-note">上記内容でよろしければエントリーを確定してください。</p>
      <div className="btn-group">
        <button className="btn-next" onClick={onConfirm} disabled={submitting}>
          {submitting ? '処理中...' : 'エントリーを確定する'}
        </button>
        <button className="btn-back" onClick={onBack} disabled={submitting}>← 戻る</button>
      </div>
    </div>
  );
}
