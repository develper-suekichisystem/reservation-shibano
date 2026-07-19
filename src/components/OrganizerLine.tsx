import { useState } from 'react';
import { ORGANIZER_LINE_URL } from '../lib/organizer';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function OrganizerLine({ onNext, onBack }: Props) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="organizer-step">
      <h2 className="section-title">大会運営者のLINEを追加</h2>

      <div className="organizer-line">
        <p className="organizer-line-title">エントリーの前にLINEを追加してください</p>
        <p className="organizer-line-message">
          大会の連絡・当日のご案内は運営者の個人LINEで行います。<br />
          下のボタンから友だち追加をお願いします。
        </p>
        <a
          className="btn-line-add"
          href={ORGANIZER_LINE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          運営者LINEを追加する
        </a>
      </div>

      <label className="organizer-check">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => setChecked(e.target.checked)}
        />
        運営者LINEを追加しました
      </label>

      <div className="btn-group">
        <button className="btn-next" onClick={onNext} disabled={!checked}>
          エントリー画面へ進む
        </button>
        <button className="btn-back" onClick={onBack}>← 戻る</button>
      </div>
    </div>
  );
}
