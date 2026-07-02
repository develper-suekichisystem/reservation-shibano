import { useState } from 'react';
import { useLiff } from '../hooks/useLiff';
import { LoadingSpinner } from './LoadingSpinner';

// 自分の LINE userId を確認するためのユーティリティ画面（/whoami）
// ADMIN_LINE_USER_ID の値を調べる用途。LINE（LIFF）で開くこと。
export function WhoAmI() {
  const { isReady, userId, displayName, error } = useLiff();
  const [copied, setCopied] = useState(false);

  if (!isReady && !error) return <LoadingSpinner />;

  async function copy() {
    if (!userId) return;
    try {
      await navigator.clipboard.writeText(userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボード不可の環境では手動コピー
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">ONE UP</h1>
        <p className="app-subtitle">LINE userId 確認</p>
      </header>

      <main className="app-main">
        {error && <div className="error-screen">エラー: {error}</div>}

        {!error && (
          <div className="entry-form">
            <p className="form-hint" style={{ marginBottom: 12 }}>
              下の値を <code>ADMIN_LINE_USER_ID</code> に設定してください。
            </p>

            {displayName && (
              <div className="form-group">
                <label className="form-label">表示名</label>
                <div className="form-input" style={{ background: 'var(--gray-50)' }}>{displayName}</div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">LINE userId</label>
              <div
                className="form-input"
                style={{ background: 'var(--gray-50)', wordBreak: 'break-all', userSelect: 'all' }}
              >
                {userId ?? '取得できませんでした'}
              </div>
            </div>

            {userId && (
              <div className="btn-group">
                <button className="btn-next" onClick={copy}>
                  {copied ? 'コピーしました ✓' : 'コピーする'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
