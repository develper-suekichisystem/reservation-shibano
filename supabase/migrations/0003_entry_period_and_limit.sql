-- ============================================================
-- Migration 0003: エントリー受付期間 / エントリー制限 / 管理者登録
--   - tournaments に entry_start_at / entry_end_at / entry_limit_enabled を追加
--   - entries の line_user_id / representative_name / phone を NULL 許容に
--     （管理者登録はチーム名のみで作成できる）
--   - entries.fiscal_year を NULL 許容に
--     （エントリー制限ONの大会のみ年度を記録し、年度制限の判定に使う）
--   - 一意制約を「年度1エントリー（制限ON時）」＋「1大会1エントリー」に再構成
-- 適用対象: 0002 適用済みのDB
-- ============================================================

-- ── tournaments ─────────────────────────────────────────────
-- エントリー開始日時（NULL = 即時エントリー可能）
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS entry_start_at TIMESTAMPTZ;
-- エントリー終了日時（NULL = 開催日の1週間前まで）
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS entry_end_at   TIMESTAMPTZ;
-- エントリー制限（ON = 同一年度1アカウント1エントリー）
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS entry_limit_enabled BOOLEAN NOT NULL DEFAULT true;

-- 既存の大会の初期値: エントリー開始 2026/09/01 19:00（日本時間）・制限ON
UPDATE tournaments
   SET entry_start_at = TIMESTAMPTZ '2026-09-01 19:00:00+09',
       entry_limit_enabled = true
 WHERE entry_start_at IS NULL;

-- ── entries ─────────────────────────────────────────────────
-- 管理者登録（チーム名のみ）を許容するため必須制約を外す
ALTER TABLE entries ALTER COLUMN line_user_id        DROP NOT NULL;
ALTER TABLE entries ALTER COLUMN representative_name DROP NOT NULL;
ALTER TABLE entries ALTER COLUMN phone               DROP NOT NULL;
-- 年度は「エントリー制限ONの大会」のみ記録する
ALTER TABLE entries ALTER COLUMN fiscal_year         DROP NOT NULL;

-- 既存データ: 制限OFFの大会に紐づくエントリーの年度をクリアする
UPDATE entries e
   SET fiscal_year = NULL
  FROM tournaments t
 WHERE t.id = e.tournament_id
   AND t.entry_limit_enabled = false;

-- ── 一意制約の再構成 ────────────────────────────────────────
DROP INDEX IF EXISTS entries_one_per_year_idx;

-- 制限ONの大会: 1アカウントにつき1年度1エントリー
CREATE UNIQUE INDEX IF NOT EXISTS entries_one_per_year_idx
  ON entries (line_user_id, fiscal_year)
  WHERE status = 'confirmed'
    AND line_user_id IS NOT NULL
    AND fiscal_year  IS NOT NULL;

-- 全大会共通: 1アカウントにつき同一大会1エントリー
-- （line_user_id が NULL の管理者登録は対象外）
CREATE UNIQUE INDEX IF NOT EXISTS entries_one_per_tournament_idx
  ON entries (tournament_id, line_user_id)
  WHERE status = 'confirmed'
    AND line_user_id IS NOT NULL;
