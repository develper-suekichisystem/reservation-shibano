import { useState } from 'react';

const SESSION_KEY = 'shibano_admin_auth';
const ADMIN_PASSWORD = 'demo';

export function isAdminAuthenticated(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === 'ok';
}

interface Props {
  onLogin: () => void;
}

export function AdminLogin({ onLogin }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'ok');
      onLogin();
    } else {
      setError(true);
      setPassword('');
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">
          <h1 className="app-title" style={{ color: 'var(--primary)' }}>ONE UP</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 4 }}>管理画面</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">パスワード</label>
            <input
              className={`form-input${error ? ' error' : ''}`}
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(false); }}
              placeholder="パスワードを入力"
              autoFocus
            />
            {error && <span className="error-msg">パスワードが違います</span>}
            <span className="form-hint">デモ用パスワード: demo</span>
          </div>
          <button type="submit" className="btn-next">ログイン</button>
        </form>
      </div>
    </div>
  );
}
