import { useState } from 'react';
import { resetDemoData } from '../../lib/mockDb';
import { EntryAdmin } from './EntryAdmin';
import { TournamentAdmin } from './TournamentAdmin';
import { AdminLogin, isAdminAuthenticated } from './AdminLogin';

type AdminTab = 'entries' | 'tournaments';

export function AdminPage() {
  const [authed, setAuthed] = useState(isAdminAuthenticated());
  const [tab, setTab] = useState<AdminTab>('entries');
  const [resetting, setResetting] = useState(false);

  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />;

  async function handleReset() {
    if (!confirm('デモデータを初期状態に戻しますか？\n（大会・エントリーがすべてリセットされます）')) return;
    setResetting(true);
    await resetDemoData();
    location.reload();
  }

  return (
    <div className="admin-page">
      <header className="app-header">
        <h1 className="app-title">ONE UP</h1>
        <p className="app-subtitle">管理画面</p>
      </header>

      <div className="admin-tabs">
        <button
          className={`admin-tab${tab === 'entries' ? ' active' : ''}`}
          onClick={() => setTab('entries')}
        >
          エントリー一覧
        </button>
        <button
          className={`admin-tab${tab === 'tournaments' ? ' active' : ''}`}
          onClick={() => setTab('tournaments')}
        >
          大会管理
        </button>
      </div>

      <div className="admin-content">
        {tab === 'entries' && <EntryAdmin />}
        {tab === 'tournaments' && <TournamentAdmin />}
      </div>

      <div className="admin-footer">
        <button className="btn-reset" onClick={handleReset} disabled={resetting}>
          {resetting ? 'リセット中...' : 'デモデータをリセット'}
        </button>
      </div>
    </div>
  );
}
