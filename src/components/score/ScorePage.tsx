import { useEffect, useState } from 'react';
import { useLiff } from '../../hooks/useLiff';
import { useLoading } from '../../contexts/LoadingContext';
import { LoadingSpinner } from '../LoadingSpinner';
import { ScoreForm } from './ScoreForm';
import { fetchTodayTournaments } from '../../lib/db';
import { formatEventDate } from '../../lib/format';
import type { Tournament } from '../../types';

export function ScorePage() {
  const { isReady, isLoggedIn, userId, displayName, error } = useLiff();
  const { withLoading } = useLoading();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selected, setSelected] = useState<Tournament | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    withLoading(async () => {
      // 開催中（＝本日開催）の大会のみスコア登録の対象
      setTournaments(await fetchTodayTournaments());
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isReady || (!isLoggedIn && !error)) return <LoadingSpinner />;
  if (error) return <div className="error-screen">エラー: {error}</div>;

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">ONE UP</h1>
        <p className="app-subtitle">スコア登録</p>
      </header>

      <main className="app-main">
        {completed ? (
          <div className="complete">
            <div className="complete-icon">✓</div>
            <h2 className="section-title">スコアを送信しました</h2>
            <p className="complete-note">運営が確認します。ありがとうございました。</p>
            <div className="btn-group">
              <button
                className="btn-next"
                onClick={() => { setCompleted(false); setSelected(null); }}
              >
                続けて登録する
              </button>
            </div>
          </div>
        ) : selected ? (
          <ScoreForm
            tournament={selected}
            lineUserId={userId}
            lineDisplayName={displayName}
            onBack={() => setSelected(null)}
            onDone={() => setCompleted(true)}
          />
        ) : (
          <div className="tournament-select">
            <h2 className="section-title">大会を選択</h2>
            {tournaments.length === 0 ? (
              <p className="no-data">本日開催中の大会はありません。</p>
            ) : (
              <div className="tournament-list">
                {tournaments.map(t => (
                  <button
                    key={t.id}
                    className="tournament-card"
                    onClick={() => setSelected(t)}
                  >
                    <div className="tournament-header">
                      <span className="tournament-name">{t.name}</span>
                      <span className="badge badge-open">開催中</span>
                    </div>
                    <div className="tournament-meta">
                      <span>📅 {formatEventDate(t.event_date)}</span>
                      <span>📍 {t.venue}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
