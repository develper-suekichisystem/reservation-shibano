import { useState } from 'react';
import { useLoading } from './contexts/LoadingContext';
import { useLiff } from './hooks/useLiff';
import { StepIndicator } from './components/StepIndicator';
import { ProfileForm } from './components/ProfileForm';
import { TournamentSelect } from './components/TournamentSelect';
import { EntryForm } from './components/EntryForm';
import { Confirmation } from './components/Confirmation';
import { Complete } from './components/Complete';
import { AdminPage } from './components/admin/AdminPage';
import { LoadingSpinner } from './components/LoadingSpinner';
import { createEntry, fetchUserProfile, saveUserProfile, fetchUserEntry } from './lib/mockDb';
import { IS_MOCK_LIFF } from './lib/liff';
import type { Step, EntryState, TournamentWithCount, UserProfile } from './types';

const INITIAL_STATE: EntryState = {
  selectedTournament: null,
  teamName: '',
  representativeName: '',
};

function EntryApp() {
  const { isReady, isLoggedIn, userId, displayName, pictureUrl, error } = useLiff();
  const { withLoading } = useLoading();
  const [step, setStep] = useState<Step>('profile');
  const [state, setState] = useState<EntryState>(INITIAL_STATE);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [enteredFiscalYear, setEnteredFiscalYear] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completedId, setCompletedId] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  // LIFF 準備完了後、プロフィール・既存エントリーを確認（一度だけ実行）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const [initialized, setInitialized] = useState(false);
  if (isReady && isLoggedIn && userId && !initialized) {
    setInitialized(true);
    Promise.resolve().then(() => withLoading(async () => {
      const profile = await fetchUserProfile(userId);
      setUserProfile(profile);
      const currentYear = String(new Date().getFullYear());
      const existing = await fetchUserEntry(userId, currentYear);
      if (existing) setEnteredFiscalYear(existing.fiscal_year);
      setStep(profile ? 'tournament' : 'profile');
    }));
  }

  if (!isReady || (!isLoggedIn && !error)) return <LoadingSpinner />;
  if (error)   return <div className="error-screen">エラー: {error}</div>;
  if (!userId) return <LoadingSpinner />;

  const name = displayName ?? 'ゲスト';

  function update(updates: Partial<EntryState>) {
    setState(prev => ({ ...prev, ...updates }));
  }

  async function handleProfileSave(fullName: string, phone: string) {
    setProfileSaving(true);
    await withLoading(async () => {
      await saveUserProfile({ line_user_id: userId!, full_name: fullName, phone });
      setUserProfile({ line_user_id: userId!, full_name: fullName, phone, created_at: new Date().toISOString() });
      setStep('tournament');
    });
    setProfileSaving(false);
  }

  function handleTournamentSelect(tournament: TournamentWithCount) {
    update({ selectedTournament: tournament });
    setStep('form');
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

  const showStepIndicator = step !== 'complete' && step !== 'profile';

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">ONE UP</h1>
        <p className="app-subtitle">大会エントリー受付</p>
      </header>

      {showStepIndicator && <StepIndicator currentStep={step} />}

      <main className="app-main">
        {step === 'profile' && (
          <ProfileForm onSave={handleProfileSave} saving={profileSaving} />
        )}
        {step === 'tournament' && (
          <TournamentSelect
            lineUserId={userId}
            enteredFiscalYear={enteredFiscalYear}
            onSelect={handleTournamentSelect}
          />
        )}
        {step === 'form' && (
          <EntryForm
            state={state}
            displayName={name}
            pictureUrl={pictureUrl}
            onChange={update}
            onNext={() => setStep('confirm')}
            onBack={() => setStep('tournament')}
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

      {userProfile && step === 'tournament' && (
        <div className="user-info-bar">
          登録名: {userProfile.full_name}　{userProfile.phone}
        </div>
      )}
    </div>
  );
}

export default function App() {
  if (window.location.pathname === '/admin') return <AdminPage />;
  return <EntryApp />;
}
