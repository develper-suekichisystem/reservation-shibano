import { useEffect, useState } from 'react';
import { fetchActiveTournaments } from '../lib/db';
import { useLoading } from '../contexts/LoadingContext';
import {
  formatEventDate, formatDateTime, entryPeriodStatus, entryStartAt, entryEndAt, daysUntilEvent,
} from '../lib/format';
import type { TournamentWithCount } from '../types';

interface Props {
  lineUserId: string;
  enteredFiscalYears: string[];    // 制限ONの大会でエントリー済みの年度
  enteredTournamentIds: string[];  // エントリー済みの大会ID
  onSelect: (tournament: TournamentWithCount) => void;
}

function statusBadge(t: TournamentWithCount, isEnteredYear: boolean, isEntered: boolean) {
  if (isEntered) return <span className="badge badge-entered">エントリー済み</span>;
  if (isEnteredYear) return <span className="badge badge-entered">エントリー済み年度</span>;
  const period = entryPeriodStatus(t);
  if (period === 'before') return <span className="badge badge-few">受付開始前</span>;
  if (period === 'closed') return <span className="badge badge-full">受付終了</span>;
  const remaining = t.capacity - t.confirmed_count;
  if (remaining <= 0) return <span className="badge badge-full">満員</span>;
  if (remaining <= 2) return <span className="badge badge-few">残り{remaining}枠</span>;
  return <span className="badge badge-open">受付中</span>;
}

// 直近開催される大会順（未開催を近い順で先頭、開催済みは後方）
function byUpcoming(a: TournamentWithCount, b: TournamentWithCount): number {
  const da = daysUntilEvent(a.event_date);
  const db = daysUntilEvent(b.event_date);
  const aUpcoming = da >= 0;
  const bUpcoming = db >= 0;
  if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
  return aUpcoming ? da - db : db - da;
}

// 年度ごとにグループ化（各年度内は直近開催順に並べる）
function groupByFiscalYear(tournaments: TournamentWithCount[]): Map<string, TournamentWithCount[]> {
  const map = new Map<string, TournamentWithCount[]>();
  for (const t of tournaments) {
    if (!map.has(t.fiscal_year)) map.set(t.fiscal_year, []);
    map.get(t.fiscal_year)!.push(t);
  }
  for (const list of map.values()) list.sort(byUpcoming);
  return map;
}

export function TournamentSelect({
  lineUserId: _lineUserId, enteredFiscalYears, enteredTournamentIds, onSelect,
}: Props) {
  const [tournaments, setTournaments] = useState<TournamentWithCount[]>([]);
  const { withLoading } = useLoading();

  useEffect(() => {
    withLoading(async () => {
      const list = await fetchActiveTournaments();
      // 終了した大会（開催日が過ぎたもの）は参加者一覧に表示しない
      setTournaments(list.filter(t => daysUntilEvent(t.event_date) >= 0));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = groupByFiscalYear(tournaments);
  const years = Array.from(grouped.keys()).sort();

  return (
    <div className="tournament-select">
      <h2 className="section-title">大会を選択</h2>

      {enteredFiscalYears.length > 0 && (
        <div className="year-notice">
          ℹ️ {enteredFiscalYears.join('・')}年度の大会には既にエントリー済みです。
          他の年度の大会をお選びください。
        </div>
      )}

      {years.map(year => (
        <div key={year} className="year-group">
          <h3 className="year-heading">{year}年度</h3>
          <div className="tournament-list">
            {grouped.get(year)!.map(t => {
              const isFull = t.confirmed_count >= t.capacity;
              const isEntered = enteredTournamentIds.includes(t.id);
              // 年度制限は「制限ONの大会」のみ適用
              const isEnteredYear = t.entry_limit_enabled
                && !isEntered
                && enteredFiscalYears.includes(t.fiscal_year);
              const period = entryPeriodStatus(t);
              const isOpen = period === 'open';
              const disabled = isFull || isEntered || isEnteredYear || !isOpen;

              return (
                <button
                  key={t.id}
                  className={`tournament-card${disabled ? ' disabled' : ''}`}
                  onClick={() => !disabled && onSelect(t)}
                  disabled={disabled}
                >
                  <div className="tournament-header">
                    <span className="tournament-name">{t.name}</span>
                    {statusBadge(t, isEnteredYear, isEntered)}
                  </div>
                  <div className="tournament-meta">
                    <span>📅 {formatEventDate(t.event_date)}</span>
                    <span>📍 {t.venue}</span>
                    <span>👥 出場枠 {t.capacity}チーム（申込 {t.confirmed_count}チーム）</span>
                    <span>📝 受付 {t.entry_start_at ? formatDateTime(t.entry_start_at) : '受付中'}
                      　〜 {formatDateTime(entryEndAt(t).toISOString())}</span>
                  </div>
                  {t.description && (
                    <div className="tournament-desc">{t.description}</div>
                  )}
                  {period === 'before' && !isEntered && !isEnteredYear && (
                    <div className="tournament-full-note">
                      この大会の受付開始は {formatDateTime(entryStartAt(t)!.toISOString())} からです。
                    </div>
                  )}
                  {period === 'closed' && !isEntered && !isEnteredYear && (
                    <div className="tournament-full-note">
                      この大会は受付を終了しました。
                    </div>
                  )}
                  {isFull && isOpen && !isEntered && !isEnteredYear && (
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
