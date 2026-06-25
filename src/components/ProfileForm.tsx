import { useState } from 'react';

interface Props {
  onSave: (fullName: string, phone: string) => void;
  saving: boolean;
}

interface Errors {
  fullName?: string;
  phone?: string;
}

export function ProfileForm({ onSave, saving }: Props) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Errors>({});

  function validate(): Errors {
    const errs: Errors = {};
    if (!fullName.trim()) errs.fullName = 'お名前を入力してください';
    const digits = phone.replace(/[-ー‐\s]/g, '');
    if (!digits) {
      errs.phone = '電話番号を入力してください';
    } else if (!/^0\d{9,10}$/.test(digits)) {
      errs.phone = '電話番号の形式が正しくありません（例: 090-1234-5678）';
    }
    return errs;
  }

  function handleSave() {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length === 0) onSave(fullName.trim(), phone.trim());
  }

  return (
    <div className="profile-form">
      <div className="profile-welcome">
        <div className="profile-welcome-icon">👋</div>
        <h2 className="profile-welcome-title">はじめまして！</h2>
        <p className="profile-welcome-text">
          ご利用の前に、お客様情報を登録してください。<br />
          一度登録すると次回以降は不要です。
        </p>
      </div>

      <div className="form-group">
        <label className="form-label">お名前（フルネーム） <span className="required">*</span></label>
        <input
          className={`form-input${errors.fullName ? ' error' : ''}`}
          type="text"
          placeholder="芝野 花子"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
        />
        {errors.fullName && <span className="error-msg">{errors.fullName}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">電話番号 <span className="required">*</span></label>
        <input
          className={`form-input${errors.phone ? ' error' : ''}`}
          type="tel"
          placeholder="090-1234-5678"
          value={phone}
          onChange={e => setPhone(e.target.value)}
        />
        {errors.phone && <span className="error-msg">{errors.phone}</span>}
        <p className="form-hint">緊急連絡等にのみ使用します。</p>
      </div>

      <div className="btn-group">
        <button className="btn-next" onClick={handleSave} disabled={saving}>
          {saving ? '登録中...' : '登録して続ける'}
        </button>
      </div>
    </div>
  );
}
