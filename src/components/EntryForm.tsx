import { useState } from 'react';
import { formatEventDate } from '../lib/format';
import type { EntryState } from '../types';

interface Props {
  state: EntryState;
  displayName: string;
  pictureUrl: string | null;
  onChange: (updates: Partial<EntryState>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface Errors {
  teamName?: string;
  representativeName?: string;
}

function validate(state: EntryState): Errors {
  const errors: Errors = {};
  if (!state.teamName.trim()) errors.teamName = 'チーム名を入力してください';
  if (!state.representativeName.trim()) errors.representativeName = '代表者名を入力してください';
  return errors;
}

export function EntryForm({ state, displayName, pictureUrl, onChange, onNext, onBack }: Props) {
  const [errors, setErrors] = useState<Errors>({});

  function handleNext() {
    const errs = validate(state);
    setErrors(errs);
    if (Object.keys(errs).length === 0) onNext();
  }

  return (
    <div className="entry-form">
      <h2 className="section-title">エントリー情報の入力</h2>

      {state.selectedTournament && (
        <div className="selected-tournament">
          <p className="selected-tournament-name">{state.selectedTournament.name}</p>
          <p className="selected-tournament-meta">
            {formatEventDate(state.selectedTournament.event_date)}　{state.selectedTournament.venue}
          </p>
        </div>
      )}

      <div className="line-profile-card">
        {pictureUrl ? (
          <img src={pictureUrl} alt={displayName} className="line-avatar" />
        ) : (
          <div className="line-avatar-placeholder">
            {displayName.slice(0, 1)}
          </div>
        )}
        <div className="line-profile-info">
          <p className="line-profile-label">LINEアカウント</p>
          <p className="line-profile-name">{displayName}</p>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">チーム名 <span className="required">*</span></label>
        <input
          className={`form-input${errors.teamName ? ' error' : ''}`}
          type="text"
          placeholder="チームサンダー"
          value={state.teamName}
          onChange={e => onChange({ teamName: e.target.value })}
        />
        {errors.teamName && <span className="error-msg">{errors.teamName}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">代表者名（フルネーム） <span className="required">*</span></label>
        <input
          className={`form-input${errors.representativeName ? ' error' : ''}`}
          type="text"
          placeholder="山田 太郎"
          value={state.representativeName}
          onChange={e => onChange({ representativeName: e.target.value })}
        />
        {errors.representativeName && <span className="error-msg">{errors.representativeName}</span>}
      </div>

      <div className="btn-group">
        <button className="btn-next" onClick={handleNext}>確認へ進む</button>
        <button className="btn-back" onClick={onBack}>← 戻る</button>
      </div>
    </div>
  );
}
