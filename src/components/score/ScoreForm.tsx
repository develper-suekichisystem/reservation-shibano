import { useEffect, useState } from 'react';
import { useLoading } from '../../contexts/LoadingContext';
import { createScore, fetchTeamNames } from '../../lib/db';
import { formatEventDate } from '../../lib/format';
import type { Tournament, ScoreSet } from '../../types';

interface Props {
  tournament: Tournament;
  lineUserId: string | null;
  lineDisplayName: string | null;
  onBack: () => void;
  onDone: () => void;
}

const EMPTY_SETS = [
  { a: '', b: '' },
  { a: '', b: '' },
  { a: '', b: '' },
];

interface Errors {
  court?: string;
  teams?: string;
  sets?: string;
  winner?: string;
  referee?: string;
  refereeName?: string;
}

// "21" → 21 / "" → null（数値でなければ NaN）
function toScore(value: string): number | null {
  if (!value.trim()) return null;
  return Number(value);
}

export function ScoreForm({ tournament, lineUserId, lineDisplayName, onBack, onDone }: Props) {
  const { withLoading } = useLoading();
  const [teams, setTeams] = useState<string[]>([]);
  const [court, setCourt] = useState('');
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [sets, setSets] = useState(EMPTY_SETS);
  const [winner, setWinner] = useState('');
  const [refereeTeam, setRefereeTeam] = useState('');
  const [refereeName, setRefereeName] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    withLoading(async () => {
      setTeams(await fetchTeamNames(tournament.id));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament.id]);

  // 対戦チームを変えたら、選ばれていた勝者が不整合にならないようリセット
  useEffect(() => {
    if (winner && winner !== teamA && winner !== teamB) setWinner('');
  }, [teamA, teamB, winner]);

  function updateSet(index: number, side: 'a' | 'b', value: string) {
    setSets(prev => prev.map((s, i) => (i === index ? { ...s, [side]: value } : s)));
  }

  function validate(): Errors {
    const errs: Errors = {};
    if (!court) errs.court = 'コートを選択してください';
    if (!teamA || !teamB) {
      errs.teams = '対戦する2チームを選択してください';
    } else if (teamA === teamB) {
      errs.teams = '同じチーム同士は選択できません';
    }

    const filled = sets.filter(s => s.a.trim() || s.b.trim());
    if (filled.length === 0) {
      errs.sets = '1セット以上のスコアを入力してください';
    } else if (filled.some(s => {
      const a = toScore(s.a);
      const b = toScore(s.b);
      return a === null || b === null || Number.isNaN(a) || Number.isNaN(b) || a < 0 || b < 0;
    })) {
      errs.sets = '入力したセットは両チームの得点を0以上の数値で入力してください';
    }

    if (!winner) {
      errs.winner = '勝者チームを選択してください';
    } else if (!errs.sets && !errs.teams) {
      // 入力済みセットの取得数と勝者チームが矛盾していないか確認
      let wonA = 0;
      let wonB = 0;
      let drawn = false;
      for (const s of filled) {
        const a = toScore(s.a)!;
        const b = toScore(s.b)!;
        if (a > b) wonA++;
        else if (b > a) wonB++;
        else drawn = true;
      }
      if (drawn) {
        errs.sets = '同点のセットがあります。スコアを確認してください';
      } else if (wonA === wonB) {
        errs.winner = 'セットの取得数が同数です。スコアを確認してください';
      } else {
        const shouldWin = wonA > wonB ? teamA : teamB;
        if (winner !== shouldWin) {
          errs.winner = `スコアでは「${shouldWin}」が${Math.max(wonA, wonB)}-${Math.min(wonA, wonB)}で勝っています。勝者チームかスコアを確認してください`;
        }
      }
    }
    if (!refereeTeam) errs.referee = '審判チームを選択してください';
    if (!refereeName.trim()) errs.refereeName = '審判担当者名を入力してください';
    return errs;
  }

  async function handleSubmit() {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const payload: ScoreSet[] = sets.map(s => ({ a: toScore(s.a), b: toScore(s.b) }));

    // 送信前に入力内容を確認してもらう
    const setLines = payload
      .map((s, i) => (s.a === null && s.b === null ? null : `　第${i + 1}セット ${s.a ?? '-'} － ${s.b ?? '-'}`))
      .filter(Boolean)
      .join('\n');
    const message = [
      'この内容でスコアを送信します。よろしいですか？',
      '',
      `コート：${court}`,
      `対戦：${teamA} vs ${teamB}`,
      setLines,
      `勝者：${winner}`,
      `審判：${refereeTeam}（${refereeName.trim()}）`,
    ].join('\n');
    if (!confirm(message)) return;

    setSubmitting(true);
    await withLoading(async () => { try {
      await createScore({
        tournamentId: tournament.id,
        court,
        teamA,
        teamB,
        sets: payload,
        winnerTeam: winner,
        refereeTeam,
        refereeName,
        lineUserId,
        lineDisplayName,
      });
      onDone();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'スコアの送信に失敗しました');
    } finally {
      setSubmitting(false);
    } });
  }

  return (
    <div className="entry-form">
      <h2 className="section-title">スコア登録</h2>

      <div className="selected-tournament">
        <p className="selected-tournament-name">{tournament.name}</p>
        <p className="selected-tournament-meta">
          {formatEventDate(tournament.event_date)}　{tournament.venue}
        </p>
      </div>

      {teams.length === 0 && (
        <div className="year-notice">
          ℹ️ この大会にはチームが登録されていません。運営にお問い合わせください。
        </div>
      )}

      <div className="form-group">
        <label className="form-label">コート <span className="required">*</span></label>
        <select
          className={`form-input${errors.court ? ' error' : ''}`}
          value={court}
          onChange={e => setCourt(e.target.value)}
        >
          <option value="">選択してください</option>
          {tournament.courts.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {tournament.courts.length === 0 && (
          <p className="form-hint">コートが登録されていません。運営にお問い合わせください。</p>
        )}
        {errors.court && <span className="error-msg">{errors.court}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">対戦チーム① <span className="required">*</span></label>
          <select
            className={`form-input${errors.teams ? ' error' : ''}`}
            value={teamA}
            onChange={e => setTeamA(e.target.value)}
          >
            <option value="">選択してください</option>
            {teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">対戦チーム② <span className="required">*</span></label>
          <select
            className={`form-input${errors.teams ? ' error' : ''}`}
            value={teamB}
            onChange={e => setTeamB(e.target.value)}
          >
            <option value="">選択してください</option>
            {teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      {errors.teams && <span className="error-msg">{errors.teams}</span>}

      <div className="form-group">
        <label className="form-label">スコア <span className="required">*</span></label>
        <div className="score-sets">
          {sets.map((s, i) => (
            <div key={i} className="score-set-row">
              <span className="score-set-label">第{i + 1}セット</span>
              <input
                className="form-input score-input"
                type="number"
                inputMode="numeric"
                min={0}
                value={s.a}
                onChange={e => updateSet(i, 'a', e.target.value)}
                placeholder={teamA || '①'}
              />
              <span className="score-sep">－</span>
              <input
                className="form-input score-input"
                type="number"
                inputMode="numeric"
                min={0}
                value={s.b}
                onChange={e => updateSet(i, 'b', e.target.value)}
                placeholder={teamB || '②'}
              />
            </div>
          ))}
        </div>
        <p className="form-hint">左が対戦チーム①、右が対戦チーム②の得点です。行わなかったセットは空欄のままにしてください。</p>
        {errors.sets && <span className="error-msg">{errors.sets}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">勝者チーム <span className="required">*</span></label>
        <select
          className={`form-input${errors.winner ? ' error' : ''}`}
          value={winner}
          onChange={e => setWinner(e.target.value)}
          disabled={!teamA || !teamB || teamA === teamB}
        >
          <option value="">選択してください</option>
          {[teamA, teamB].filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {errors.winner && <span className="error-msg">{errors.winner}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">審判チーム <span className="required">*</span></label>
        <select
          className={`form-input${errors.referee ? ' error' : ''}`}
          value={refereeTeam}
          onChange={e => setRefereeTeam(e.target.value)}
        >
          <option value="">選択してください</option>
          {teams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {errors.referee && <span className="error-msg">{errors.referee}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">審判担当者名 <span className="required">*</span></label>
        <input
          className={`form-input${errors.refereeName ? ' error' : ''}`}
          type="text"
          value={refereeName}
          onChange={e => setRefereeName(e.target.value)}
          placeholder="山田 太郎"
        />
        {errors.refereeName && <span className="error-msg">{errors.refereeName}</span>}
      </div>

      <div className="btn-group">
        <button className="btn-next" onClick={handleSubmit} disabled={submitting}>
          {submitting ? '送信中...' : 'スコアを送信する'}
        </button>
        <button className="btn-back" onClick={onBack}>← 戻る</button>
      </div>
    </div>
  );
}
