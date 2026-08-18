-- ============================================================
-- Migration 0005: 大会ごとのスコア通知先メールアドレス
--   - tournaments に notify_emails（運営者メールアドレスの配列）を追加
--   - 管理画面のスコア管理タブから設定する
-- 適用対象: 0004 適用済みのDB
-- ============================================================

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS notify_emails TEXT[] NOT NULL DEFAULT '{}';
