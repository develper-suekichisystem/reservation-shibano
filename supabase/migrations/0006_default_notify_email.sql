-- ============================================================
-- Migration 0006: スコア通知先のデフォルトアドレス
--   - 既存の大会すべてに official.oneup.group@gmail.com を追加
--   - 今後作成する大会は既定値として同アドレスを持つ
-- 適用対象: 0005 適用済みのDB
-- ============================================================

ALTER TABLE tournaments
  ALTER COLUMN notify_emails SET DEFAULT '{official.oneup.group@gmail.com}';

UPDATE tournaments
   SET notify_emails = notify_emails || '{official.oneup.group@gmail.com}'
 WHERE NOT ('official.oneup.group@gmail.com' = ANY (notify_emails));
