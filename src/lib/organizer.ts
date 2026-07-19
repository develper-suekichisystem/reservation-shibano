// 大会運営者の個人LINE友だち追加URL（アプリ共通・環境変数で設定）
// 未設定の場合は LINE 登録ステップ／案内を表示しない。
export const ORGANIZER_LINE_URL =
  (import.meta.env.VITE_ORGANIZER_LINE_URL as string | undefined) || undefined;
