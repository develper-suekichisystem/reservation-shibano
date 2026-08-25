import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const RESEND_URL = 'https://api.resend.com/emails';

// 送信元（Resend で認証済みのドメインのアドレス）
const FROM = process.env.SCORE_MAIL_FROM ?? 'ONE UP <services-notify@suekichi-system.com>';

interface ScoreSetPayload {
  a: number | null;
  b: number | null;
}

interface NotifyScorePayload {
  tournamentId: string;
  court: string;
  teamA: string;
  teamB: string;
  sets: ScoreSetPayload[];
  winnerTeam: string;
  refereeTeam: string;
  refereeName: string;
  lineDisplayName?: string | null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const {
    tournamentId, court, teamA, teamB,
    sets, winnerTeam, refereeTeam, refereeName,
  } = req.body as NotifyScorePayload;

  if (!tournamentId) {
    return res.status(400).json({ error: 'tournamentId is required' });
  }

  // 宛先は大会に登録された運営者メールアドレスを使う。
  // 任意の宛先へ送信されないよう、クライアントからは受け取らない。
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
  );
  const { data: tournament, error } = await supabase
    .from('tournaments')
    .select('name, event_date, notify_emails')
    .eq('id', tournamentId)
    .maybeSingle();
  if (error) {
    console.error('score notify lookup error:', error);
    return res.status(500).json({ error: 'Notification failed' });
  }
  if (!tournament) {
    return res.status(404).json({ error: 'Tournament not found' });
  }

  const to = (tournament.notify_emails ?? []).map((a: string) => a.trim()).filter(Boolean);

  // 通知先やAPIキーが未設定でもスコア登録自体は成功させたいので、エラーにはしない
  if (!apiKey || to.length === 0) {
    return res.status(200).json({ ok: true, skipped: true });
  }

  const setLines = (sets ?? [])
    .map((s, i) => (s.a === null && s.b === null ? null : `第${i + 1}セット　${s.a ?? '-'} － ${s.b ?? '-'}`))
    .filter((line): line is string => line !== null);

  const rows: [string, string][] = [
    ['大会', `${tournament.name}（${String(tournament.event_date).replace(/-/g, '/')}）`],
    ['コート', court],
    ['対戦', `${teamA} vs ${teamB}`],
    ['スコア', setLines.join(' ／ ') || '（未入力）'],
    ['勝者', winnerTeam],
    ['審判', `${refereeTeam}（${refereeName}）`],
    ['提出者', refereeName || '（未取得）'],
  ];

  const text = rows.map(([label, value]) => `${label}：${value}`).join('\n');
  const html = `<div style="font-family:sans-serif;font-size:14px;line-height:1.8">
    <p>スコアが提出されました。</p>
    <table style="border-collapse:collapse">
      ${rows.map(([label, value]) => `<tr>
        <th style="text-align:left;padding:4px 16px 4px 0;color:#888;white-space:nowrap">${escapeHtml(label)}</th>
        <td style="padding:4px 0">${escapeHtml(value)}</td>
      </tr>`).join('')}
    </table>
    <p style="color:#888;font-size:12px">管理画面のスコア管理タブから既読にできます。</p>
  </div>`;

  try {
    const response = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: FROM,
        to,
        subject: `【スコア提出】${tournament.name} ${court} ${teamA} vs ${teamB}`,
        text,
        html,
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Resend API error ${response.status}: ${body}`);
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('score notify error:', err);
    return res.status(500).json({ error: 'Notification failed' });
  }
}
