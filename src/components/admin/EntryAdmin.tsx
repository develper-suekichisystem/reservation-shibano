import { useEffect, useState } from 'react';
import { fetchAllTournaments, fetchEntries, cancelEntry } from '../../lib/db';
import { formatEventDate } from '../../lib/format';
import type { TournamentWithCount, Entry } from '../../types';

type EntryWithPhone = Entry & { phone?: string };

export function EntryAdmin() {
  const [tournaments, setTournaments] = useState<TournamentWithCount[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [entries, setEntries] = useState<EntryWithPhone[]>([]);
  const [loading, setLoading] = useState(true);

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
      </>)}
    </div>
  );
}
