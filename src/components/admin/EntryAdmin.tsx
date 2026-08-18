import { useEffect, useState } from 'react';
import { fetchAllTournaments, fetchEntries, cancelEntry, createAdminEntry } from '../../lib/db';
import { formatEventDate } from '../../lib/format';
import type { TournamentWithCount, Entry } from '../../types';

export function EntryAdmin() {
  const [tournaments, setTournaments] = useState<TournamentWithCount[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    (async () => {
      const list = await fetchAllTournaments();
      setTournaments(list);
      if (list.length > 0) {
        const latestYear = list
          .map(t => t.fiscal_year)
          .sort((a, b) => b.localeCompare(a))[0];
        setSelectedYear(prev => prev || latestYear);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    loadEntries(selectedId);
  }, [selectedId]);

  async function loadEntries(tournamentId: string) {
    setLoading(true);
    setEntries(await fetchEntries(tournamentId));
    setLoading(false);
  }

  async function refresh() {
    setTournaments(await fetchAllTournaments());
    await loadEntries(selectedId);
  }

  async function handleAdd() {
    const name = newTeamName.trim();
    if (!name || !selectedId) return;
    setAdding(true);
    try {
      await createAdminEntry(selectedId, name);
      setNewTeamName('');
      await refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エントリーの登録に失敗しました');
    } finally {
      setAdding(false);
    }
  }

  async function handleCancel(entry: Entry) {
    if (!confirm(`「${entry.team_name}」のエントリーをキャンセルしますか？`)) return;
    await cancelEntry(entry.id);
    await refresh();
  }

  async function handleSendNames() {
    if (!selected) return;
    const names = entries.map((e, i) => {
      // 管理者登録（代表者名・LINE名なし）はチーム名のみ
      const detail = [e.representative_name?.trim(), e.line_display_name?.trim()]
        .filter(Boolean).join(' ');
      return detail ? `${i + 1} ${e.team_name}（${detail}）` : `${i + 1} ${e.team_name}`;
    });
    if (names.length === 0) {
      alert('送信するエントリーがありません');
      return;
    }
    if (!confirm(`「${selected.name}」のエントリー者 ${names.length}名のLINE表示名を、管理者の個人LINEへ送信しますか？`)) return;
    setSending(true);
    try {
      const res = await fetch('/api/send-names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentName: selected.name, names }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `送信に失敗しました（${res.status}）`);
      }
      alert(`${names.length}名のLINE表示名を送信しました。`);
    } catch (err) {
      alert(err instanceof Error ? err.message : '送信に失敗しました');
    } finally {
      setSending(false);
    }
  }

  const selected = tournaments.find(t => t.id === selectedId);

  // 年度ごとにグループ化
  const grouped = new Map<string, TournamentWithCount[]>();
  for (const t of tournaments) {
    if (!grouped.has(t.fiscal_year)) grouped.set(t.fiscal_year, []);
    grouped.get(t.fiscal_year)!.push(t);
  }
  const years = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a));
  const yearTournaments = grouped.get(selectedYear) ?? [];

  // 年度を変更したら、その年度の大会未選択なら選択をリセット
  function handleYearChange(year: string) {
    setSelectedYear(year);
    setSelectedId('');
    setEntries([]);
  }

  return (
    <div className="entry-admin">
      <div className="admin-date-picker">
        <label>年度：</label>
        <select
          className="admin-select"
          value={selectedYear}
          onChange={e => handleYearChange(e.target.value)}
        >
          {years.map(year => (
            <option key={year} value={year}>{year}年度</option>
          ))}
        </select>
      </div>

      <div className="admin-date-picker">
        <label>大会：</label>
        <select
          className="admin-select"
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
        >
          <option value="">選択してください</option>
          {yearTournaments.map(t => (
            <option key={t.id} value={t.id}>
              {t.name}（{t.event_date.replace(/-/g, '/')}）
            </option>
          ))}
        </select>
      </div>

      {!selectedId ? (
        <p className="no-data">大会を選択するとエントリーを確認できます</p>
      ) : (<>
      {selected && (
        <div className="entry-summary">
          <span>{formatEventDate(selected.event_date)}　{selected.venue}</span>
          <span className="entry-summary-count">
            エントリー {entries.length}/{selected.capacity}チーム
          </span>
        </div>
      )}

      <div className="admin-entry-add">
        <input
          className="form-input"
          value={newTeamName}
          onChange={e => setNewTeamName(e.target.value)}
          placeholder="チーム名を入力して追加"
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
        />
        <button className="btn-add" onClick={handleAdd} disabled={adding || !newTeamName.trim()}>
          {adding ? '追加中...' : '＋ 追加'}
        </button>
      </div>

      {loading ? (
        <div className="loading">読み込み中...</div>
      ) : entries.length === 0 ? (
        <p className="no-data">この大会のエントリーはありません</p>
      ) : (
        <div className="admin-list">
          {entries.map((e, i) => (
            <div key={e.id} className="admin-card">
              <div className="admin-time">{i + 1}</div>
              <div className="admin-info">
                <div className="admin-name">{e.team_name}</div>
                {e.line_user_id ? (<>
                  <div className="admin-menu">代表: {e.representative_name || '（未入力）'}</div>
                  <div className="admin-menu">LINE: {e.line_display_name?.trim() || '（未取得）'}</div>
                </>) : (
                  <div className="admin-menu">管理者登録</div>
                )}
                {e.phone && <div className="admin-contact">{e.phone}</div>}
              </div>
              <button className="btn-cancel" onClick={() => handleCancel(e)}>
                キャンセル
              </button>
            </div>
          ))}
        </div>
      )}

      {entries.length > 0 && (
        <button
          className="btn-send-names"
          onClick={handleSendNames}
          disabled={sending}
        >
          {sending ? '送信中...' : `LINE表示名を一括送信（${entries.length}名）`}
        </button>
      )}
      </>)}
    </div>
  );
}
