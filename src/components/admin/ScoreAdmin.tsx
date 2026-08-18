import { useEffect, useState } from 'react';
import { fetchAllTournaments, fetchScores, setScoreRead, deleteScore } from '../../lib/db';
import { formatEventDate, formatDateTime } from '../../lib/format';
import type { TournamentWithCount, Score } from '../../types';

type Filter = 'unread' | 'all';

// セットスコアを "21-15 / 18-21" の形に整形
function formatSets(s: Score): string {
  const sets: [number | null, number | null][] = [
    [s.set1_a, s.set1_b],
    [s.set2_a, s.set2_b],
    [s.set3_a, s.set3_b],
  ];
  return sets
    .filter(([a, b]) => a !== null || b !== null)
    .map(([a, b]) => `${a ?? '-'}-${b ?? '-'}`)
    .join(' / ');
}

export function ScoreAdmin() {
  const [tournaments, setTournaments] = useState<TournamentWithCount[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [scores, setScores] = useState<Score[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
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
    loadScores(selectedId);
  }, [selectedId]);

  async function loadScores(tournamentId: string) {
    setLoading(true);
    setScores(await fetchScores(tournamentId));
    setLoading(false);
  }

  async function toggleRead(score: Score) {
    // 画面を先に更新し、失敗したら元に戻す
    const next = !score.is_read;
    setScores(prev => prev.map(s => (s.id === score.id ? { ...s, is_read: next } : s)));
    try {
      await setScoreRead(score.id, next);
    } catch (err) {
      setScores(prev => prev.map(s => (s.id === score.id ? { ...s, is_read: !next } : s)));
      alert(err instanceof Error ? err.message : '既読の更新に失敗しました');
    }
  }

  async function handleDelete(score: Score) {
    if (!confirm(`「${score.team_a} vs ${score.team_b}」のスコアを削除しますか？`)) return;
    await deleteScore(score.id);
    await loadScores(selectedId);
  }

  const selected = tournaments.find(t => t.id === selectedId);

  const grouped = new Map<string, TournamentWithCount[]>();
  for (const t of tournaments) {
    if (!grouped.has(t.fiscal_year)) grouped.set(t.fiscal_year, []);
    grouped.get(t.fiscal_year)!.push(t);
  }
  const years = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a));
  const yearTournaments = grouped.get(selectedYear) ?? [];

  const unreadCount = scores.filter(s => !s.is_read).length;
  const visible = filter === 'unread' ? scores.filter(s => !s.is_read) : scores;

  function handleYearChange(year: string) {
    setSelectedYear(year);
    setSelectedId('');
    setScores([]);
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
        <p className="no-data">大会を選択すると提出されたスコアを確認できます</p>
      ) : (<>
      {selected && (
        <div className="entry-summary">
          <span>{formatEventDate(selected.event_date)}　{selected.venue}</span>
          <span className="entry-summary-count">
            提出 {scores.length}件（未読 {unreadCount}件）
          </span>
        </div>
      )}

      <div className="score-filter">
        <button
          className={`score-filter-btn${filter === 'unread' ? ' active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          未読のみ（{unreadCount}）
        </button>
        <button
          className={`score-filter-btn${filter === 'all' ? ' active' : ''}`}
          onClick={() => setFilter('all')}
        >
          すべて（{scores.length}）
        </button>
      </div>

      {loading ? (
        <div className="loading">読み込み中...</div>
      ) : visible.length === 0 ? (
        <p className="no-data">
          {filter === 'unread' ? '未読のスコアはありません' : 'この大会のスコアはまだありません'}
        </p>
      ) : (
        <div className="admin-list">
          {visible.map(s => (
            <div key={s.id} className={`admin-card score-card${s.is_read ? ' read' : ''}`}>
              <label className="score-read-check">
                <input
                  type="checkbox"
                  checked={s.is_read}
                  onChange={() => toggleRead(s)}
                />
                <span>既読</span>
              </label>
              <div className="admin-info">
                <div className="admin-name">
                  {s.team_a} vs {s.team_b}
                  {!s.is_read && <span className="badge badge-few score-unread-badge">未読</span>}
                </div>
                <div className="admin-menu">🏟 {s.court}　🏆 勝者: {s.winner_team}</div>
                <div className="admin-menu">スコア: {formatSets(s) || '（未入力）'}</div>
                <div className="admin-menu">審判: {s.referee_team}（{s.referee_name}）</div>
                <div className="admin-contact">
                  {formatDateTime(s.created_at)}
                  {s.line_display_name ? `　提出: ${s.line_display_name}` : ''}
                </div>
              </div>
              <button className="btn-cancel" onClick={() => handleDelete(s)}>
                削除
              </button>
            </div>
          ))}
        </div>
      )}
      </>)}
    </div>
  );
}
