import { useEffect, useState } from 'react';
import { fetchAllTournaments, fetchEntries, cancelEntry } from '../../lib/mockDb';
import { formatEventDate } from '../../lib/format';
import type { TournamentWithCount, Entry } from '../../types';

type EntryWithPhone = Entry & { phone?: string };

export function EntryAdmin() {
  const [tournaments, setTournaments] = useState<TournamentWithCount[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [entries, setEntries] = useState<EntryWithPhone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const list = await fetchAllTournaments();
      setTournaments(list);
      if (list.length > 0) setSelectedId(prev => prev || list[0].id);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    loadEntries(selectedId);
  }, [selectedId]);

  async function loadEntries(tournamentId: string) {
    setLoading(true);
    setEntries(await fetchEntries(tournamentId) as EntryWithPhone[]);
    setLoading(false);
  }

  async function refresh() {
    setTournaments(await fetchAllTournaments());
    await loadEntries(selectedId);
  }

  async function handleCancel(entry: EntryWithPhone) {
    if (!confirm(`「${entry.team_name}」のエントリーをキャンセルしますか？`)) return;
    await cancelEntry(entry.id);
    await refresh();
  }

  const selected = tournaments.find(t => t.id === selectedId);

  // 年度ごとにセレクト表示
  const grouped = new Map<string, TournamentWithCount[]>();
  for (const t of tournaments) {
    if (!grouped.has(t.fiscal_year)) grouped.set(t.fiscal_year, []);
    grouped.get(t.fiscal_year)!.push(t);
  }
  const years = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <div className="entry-admin">
      <div className="admin-date-picker">
        <label>大会：</label>
        <select
          className="admin-select"
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
        >
          {years.map(year => (
            <optgroup key={year} label={`${year}年度`}>
              {grouped.get(year)!.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}（{t.event_date.replace(/-/g, '/')}）
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {selected && (
        <div className="entry-summary">
          <span>{formatEventDate(selected.event_date)}　{selected.venue}</span>
          <span className="entry-summary-count">
            エントリー {entries.length}/{selected.capacity}チーム
          </span>
        </div>
      )}

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
                <div className="admin-menu">代表: {e.representative_name}</div>
                {e.phone && <div className="admin-contact">{e.phone}</div>}
              </div>
              <button className="btn-cancel" onClick={() => handleCancel(e)}>
                キャンセル
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
