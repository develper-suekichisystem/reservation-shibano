const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

// 受付は開催日の何日前まで可能か
export const ENTRY_DEADLINE_DAYS = 7;

// 開催日までの残り日数（当日=0、過去=マイナス）
export function daysUntilEvent(eventDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ev = new Date(eventDate);
  ev.setHours(0, 0, 0, 0);
  return Math.floor((ev.getTime() - today.getTime()) / 86400000);
}

// 受付中か（開催 ENTRY_DEADLINE_DAYS 日前まで受付）
export function isEntryOpen(eventDate: string): boolean {
  return daysUntilEvent(eventDate) >= ENTRY_DEADLINE_DAYS;
}

// "2026-07-12" → "2026/07/12（日）"
export function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${dateStr.replace(/-/g, '/')}（${DAY_NAMES[d.getDay()]}）`;
}
