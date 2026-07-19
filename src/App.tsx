import { useState } from 'react';
import { useLoading } from './contexts/LoadingContext';
import { useLiff } from './hooks/useLiff';
import { StepIndicator } from './components/StepIndicator';
import { TournamentSelect } from './components/TournamentSelect';
import { OrganizerLine } from './components/OrganizerLine';
import { EntryForm } from './components/EntryForm';
import { Confirmation } from './components/Confirmation';
import { Complete } from './components/Complete';
import { AdminPage } from './components/admin/AdminPage';
import { WhoAmI } from './components/WhoAmI';
import { LoadingSpinner } from './components/LoadingSpinner';
import { createEntry, fetchUserEntry } from './lib/db';
import { IS_MOCK_LIFF } from './lib/liff';
import { ORGANIZER_LINE_URL } from './lib/organizer';
import type { Step, EntryState, TournamentWithCount } from './types';

const INITIAL_STATE: EntryState = {
  selectedTournament: null,
  teamName: '',
  representativeName: '',
  phone: '',
};

function EntryApp() {
  const { isReady, isLoggedIn, userId, displayName, pictureUrl, error } = useLiff();
  const { withLoading } = useLoading();
  const [step, setStep] = useState<Step>('tournament');
  const [state, setState] = useState<EntryState>(INITIAL_STATE);
  const [enteredFiscalYear, setEnteredFiscalYear] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completedId, setCompletedId] = useState('');
  // LIFF 準備完了後、既存エントリーを確認（一度だけ実行）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const [initialized, setInitialized] = useState(false);
  if (isReady && isLoggedIn && userId && !initialized) {
    setInitialized(true);
    Promise.resolve().then(() => withLoading(async () => {
      const currentYear = String(new Date().getFullYear());
      const existing = await fetchUserEntry(userId, currentYear);
      if (existing) setEnteredFiscalYear(existing.fiscal_year);
    }));
  }

  if (!isReady || (!isLoggedIn && !error)) return <LoadingSpinner />;
  if (error)   return <div className="error-screen">エラー: {error}</div>;
  if (!userId) return <LoadingSpinner />;

  const name = displayName ?? 'ゲスト';

  function update(updates: Partial<EntryState>) {
    setState(prev => ({ ...prev, ...updates }));
  }

  function handleTournamentSelect(tournament: TournamentWithCount) {
    update({ selectedTournament: tournament });
    // 運営者LINEが設定されていれば、先にLINE登録ステップを挟む
    setStep(ORGANIZER_LINE_URL ? 'line' : 'form');
  }

  async function handleConfirm() {
    if (!state.selectedTournament) return;
    const tournament = state.selectedTournament;
    setSubmitting(true);

    await withLoading(async () => { try {
      const entry = await createEntry({
        tournamentId: tournament.id,
        fiscalYear: tournament.fiscal_year,
        lineUserId: userId!,
        teamName: state.teamName,
        representativeName: state.representativeName,
        phone: state.phone,
      });

      if (!IS_MOCK_LIFF) {
        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            tournamentName: tournament.name,
            fiscalYear: tournament.fiscal_year,
            eventDate: tournament.event_date,
            venue: tournament.venue,
            teamName: entry.team_name,
            representativeName: entry.representative_name,
            entryId: entry.id,
          }),
        }).catch(console.error);
      }

      setCompletedId(entry.id);
      setStep('complete');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エントリーに失敗しました');
    } finally {
      setSubmitting(false);
    } });
  }

  function restart() {
    setState(INITIAL_STATE);
    setCompletedId('');
    setStep('tournament');
  }

  const showStepIndicator = step !== 'complete';

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">ONE UP</h1>
        <p className="app-subtitle">大会エントリー受付</p>
      </header>

      {showStepIndicator && <StepIndicator currentStep={step} />}

      <main className="app-main">
        {step === 'tournament' && (
          <TournamentSelect
            lineUserId={userId}
            enteredFiscalYear={enteredFiscalYear}
            onSelect={handleTournamentSelect}
          />
        )}
        {step === 'line' && (
          <OrganizerLine
            onNext={() => setStep('form')}
            onBack={() => setStep('tournament')}
          />
        )}
        {step === 'form' && (
          <EntryForm
            state={state}
            displayName={name}
            pictureUrl={pictureUrl}
            onChange={update}
            onNext={() => setStep('confirm')}
            onBack={() => setStep(ORGANIZER_LINE_URL ? 'line' : 'tournament')}
          />
        )}
        {step === 'confirm' && (
          <Confirmation
            state={state}
            displayName={name}
            pictureUrl={pictureUrl}
            onConfirm={handleConfirm}
            onBack={() => setStep('form')}
            submitting={submitting}
          />
        )}
        {step === 'complete' && (
          <Complete entryId={completedId} onRestart={restart} />
        )}
      </main>
    </div>
  );
}

export default function App() {
  if (window.location.pathname === '/admin') return <AdminPage />;
  if (window.location.pathname === '/whoami') return <WhoAmI />;
  return <EntryApp />;
}
