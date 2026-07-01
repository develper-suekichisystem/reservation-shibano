import { useState } from 'react';
import { EntryAdmin } from './EntryAdmin';
import { TournamentAdmin } from './TournamentAdmin';
import { AdminLogin, isAdminAuthenticated } from './AdminLogin';

type AdminTab = 'entries' | 'tournaments';

export function AdminPage() {
  const [authed, setAuthed] = useState(isAdminAuthenticated());
  const [tab, setTab] = useState<AdminTab>('entries');

  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />;

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
    </div>
  );
}
