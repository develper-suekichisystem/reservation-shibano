import type { VercelRequest, VercelResponse } from '@vercel/node';

const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';

interface SendNamesPayload {
  tournamentName: string;
  names: string[];
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

  const adminId = process.env.ADMIN_LINE_USER_ID;
  if (!adminId) {
    return res.status(400).json({ error: 'ADMIN_LINE_USER_ID が未設定です' });
  }

  const { tournamentName, names } = req.body as SendNamesPayload;
  if (!Array.isArray(names) || names.length === 0) {
    return res.status(400).json({ error: '送信するエントリー者がいません' });
  }

  // LINE テキストは 5000 文字上限。表示名一覧が長い場合は分割送信する。
  const header = `【エントリー者一覧】\n${tournamentName}\n（${names.length}チーム）`;
  const chunks: string[] = [];
  let buf = header;
  for (const name of names) {
    const line = `\n${name}`;
    if (buf.length + line.length > 4800) {
      chunks.push(buf);
      buf = name;
    } else {
      buf += buf === header ? `\n\n${name}` : line;
    }
  }
  chunks.push(buf);

  try {
    for (const text of chunks) {
      await pushMessage(adminId, text);
    }
    return res.status(200).json({ ok: true, count: names.length });
  } catch (err) {
    console.error('LINE send-names error:', err);
    return res.status(500).json({ error: '送信に失敗しました' });
  }
}
