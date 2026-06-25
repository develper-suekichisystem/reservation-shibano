const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

// "2026-07-12" → "2026/07/12（日）"
export function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${dateStr.replace(/-/g, '/')}（${DAY_NAMES[d.getDay()]}）`;
}
