import type { Tournament } from '../types';

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

// 終了日時が未登録の大会は、開催日の何日前まで受付するか
export const ENTRY_DEADLINE_DAYS = 7;

// 開催日までの残り日数（当日=0、過去=マイナス）
export function daysUntilEvent(eventDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ev = parseDateOnly(eventDate);
  return Math.floor((ev.getTime() - today.getTime()) / 86400000);
}

// "YYYY-MM-DD" → ローカルタイムのその日の 00:00
function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

// 受付期間の判定に使う大会情報（Tournament の部分集合）
export type EntryPeriod = Pick<Tournament, 'event_date' | 'entry_start_at' | 'entry_end_at'>;

// 受付開始日時（未登録なら null = 即時受付可能）
export function entryStartAt(t: EntryPeriod): Date | null {
  return t.entry_start_at ? new Date(t.entry_start_at) : null;
}

// 受付終了日時（未登録なら開催日の ENTRY_DEADLINE_DAYS 日前の終わり）
export function entryEndAt(t: EntryPeriod): Date {
  if (t.entry_end_at) return new Date(t.entry_end_at);
  const deadline = parseDateOnly(t.event_date);
  deadline.setDate(deadline.getDate() - ENTRY_DEADLINE_DAYS);
  deadline.setHours(23, 59, 59, 999);
  return deadline;
}

export type EntryPeriodStatus = 'before' | 'open' | 'closed';

export function entryPeriodStatus(t: EntryPeriod, now: Date = new Date()): EntryPeriodStatus {
  const start = entryStartAt(t);
  if (start && now < start) return 'before';
  if (now > entryEndAt(t)) return 'closed';
  return 'open';
}

// 受付中か
export function isEntryOpen(t: EntryPeriod): boolean {
  return entryPeriodStatus(t) === 'open';
}

// "2026-07-12" → "2026/07/12（日）"
export function formatEventDate(dateStr: string): string {
  const d = parseDateOnly(dateStr);
  return `${dateStr.replace(/-/g, '/')}（${DAY_NAMES[d.getDay()]}）`;
}

// ISO日時 → "2026/07/12（日）10:00"
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())}`
    + `（${DAY_NAMES[d.getDay()]}）${p(d.getHours())}:${p(d.getMinutes())}`;
}

// datetime-local 入力値（"YYYY-MM-DDTHH:mm"）⇔ ISO日時
export function toDateTimeLocalValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
    + `T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function fromDateTimeLocalValue(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
