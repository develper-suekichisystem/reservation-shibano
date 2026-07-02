import { useEffect, useState } from 'react';
import { fetchActiveTournaments } from '../lib/db';
import { useLoading } from '../contexts/LoadingContext';
import { formatEventDate, isEntryOpen, ENTRY_DEADLINE_DAYS } from '../lib/format';
import type { TournamentWithCount } from '../types';

interface Props {
  lineUserId: string;
  enteredFiscalYear: string | null; // 既にエントリー済みの年度
  onSelect: (tournament: TournamentWithCount) => void;
}

function statusBadge(t: TournamentWithCount, isEnteredYear: boolean) {
  if (isEnteredYear) return <span className="badge badge-entered">エントリー済み年度</span>;
  if (!isEntryOpen(t.event_date)) return <span className="badge badge-full">受付終了</span>;
  const remaining = t.capacity - t.confirmed_count;
  if (remaining <= 0) return <span className="badge badge-full">満員</span>;
  if (remaining <= 2) return <span className="badge badge-few">残り{remaining}枠</span>;
  return <span className="badge badge-open">受付中</span>;
}

// 年度ごとにグループ化
function groupByFiscalYear(tournaments: TournamentWithCount[]): Map<string, TournamentWithCount[]> {
  const map = new Map<string, TournamentWithCount[]>();
  for (const t of tournaments) {
    if (!map.has(t.fiscal_year)) map.set(t.fiscal_year, []);
    map.get(t.fiscal_year)!.push(t);
  }
  return map;
}

export function TournamentSelect({ lineUserId: _lineUserId, enteredFiscalYear, onSelect }: Props) {
  const [tournaments, setTournaments] = useState<TournamentWithCount[]>([]);
  const { withLoading } = useLoading();

  useEffect(() => {
    withLoading(async () => {
      setTournaments(await fetchActiveTournaments());
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = groupByFiscalYear(tournaments);
  const years = Array.from(grouped.keys()).sort();

  return (
    <div className="tournament-select">
      <h2 className="section-title">大会を選択</h2>

      {enteredFiscalYear && (
        <div className="year-notice">
          ℹ️ {enteredFiscalYear}年度の大会には既にエントリー済みです。
          他の年度の大会をお選びください。
        </div>
      )}

      {years.map(year => (
        <div key={year} className="year-group">
          <h3 className="year-heading">{year}年度</h3>
          <div className="tournament-list">
            {grouped.get(year)!.map(t => {
              const isFull = t.confirmed_count >= t.capacity;
              const isEnteredYear = enteredFiscalYear === t.fiscal_year;
              const isClosed = !isEntryOpen(t.event_date);
              const disabled = isFull || isEnteredYear || isClosed;

              return (
                <button
                  key={t.id}
                  className={`tournament-card${disabled ? ' disabled' : ''}`}
                  onClick={() => !disabled && onSelect(t)}
                  disabled={disabled}
                >
                  <div className="tournament-header">
                    <span className="tournament-name">{t.name}</span>
                    {statusBadge(t, isEnteredYear)}
                  </div>
                  <div className="tournament-meta">
                    <span>📅 {formatEventDate(t.event_date)}</span>
                    <span>📍 {t.venue}</span>
                    <span>👥 出場枠 {t.capacity}チーム（申込 {t.confirmed_count}チーム）</span>
                  </div>
                  {t.description && (
                    <div className="tournament-desc">{t.description}</div>
                  )}
                  {isClosed && !isEnteredYear && (
                    <div className="tournament-full-note">
                      この大会は受付を終了しました（開催{ENTRY_DEADLINE_DAYS}日前まで）。
                    </div>
                  )}
                  {isFull && !isClosed && !isEnteredYear && (
                    <div className="tournament-full-note">
                      この大会は出場枠が埋まっています。
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
