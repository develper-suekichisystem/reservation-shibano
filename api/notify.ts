import type { VercelRequest, VercelResponse } from '@vercel/node';

const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';

interface NotifyPayload {
  userId: string;
  tournamentName: string;
  fiscalYear: string;
  eventDate: string;
  venue: string;
  teamName: string;
  representativeName: string;
  lineDisplayName?: string | null;
  entryId: string;
}

async function pushMessage(to: string, text: string): Promise<void> {
  const res = await fetch(LINE_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ to, messages: [{ type: 'text', text }] }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LINE API error ${res.status}: ${body}`);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    userId, tournamentName, fiscalYear, eventDate, venue,
    teamName, representativeName, lineDisplayName, entryId,
  } = req.body as NotifyPayload;

  const formattedDate = eventDate.replace(/-/g, '/');
  const shortId = entryId.slice(0, 8).toUpperCase();

  const organizerLineUrl = process.env.ORGANIZER_LINE_URL;
  const organizerSection = organizerLineUrl
    ? `

大会運営者のLINEを追加してください。
大会の連絡・当日のご案内は運営者の個人LINEで行います。
▼友だち追加はこちら
${organizerLineUrl}`
    : '';

  const userMsg = `【エントリー受付】

${representativeName} 様

以下の内容でエントリーを受け付けました。

━━━━━━━━━━━━━━
大　会：${tournamentName}
年　度：${fiscalYear}年度
開催日：${formattedDate}
会　場：${venue}
チーム：${teamName}
受付番号：${shortId}
━━━━━━━━━━━━━━
${organizerSection}

キャンセルの場合はLINEよりご連絡ください。`;

  const adminMsg = `【エントリーが入りました】

大　会：${tournamentName}（${fiscalYear}年度 / ${formattedDate}）
チーム：${teamName}
代表者：${representativeName}
LINE名：${lineDisplayName ?? '（未取得）'}
受付番号：${shortId}`;

  try {
    const tasks: Promise<void>[] = [pushMessage(userId, userMsg)];
    const adminId = process.env.ADMIN_LINE_USER_ID;
    if (adminId) tasks.push(pushMessage(adminId, adminMsg));
    await Promise.all(tasks);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('LINE notify error:', err);
    return res.status(500).json({ error: 'Notification failed' });
  }
}
