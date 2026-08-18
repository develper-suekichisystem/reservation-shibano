-- ============================================================
-- Migration 0004: エントリー受付有無 / コート / スコア収集
--   - tournaments に entry_enabled（エントリー受付するか）を追加（既存はON）
--   - tournaments に courts（コート名の配列）を追加
--   - scores テーブルを新設（試合結果の提出 + 管理者の既読管理）
-- 適用対象: 0003 適用済みのDB
-- ============================================================

-- ── tournaments ─────────────────────────────────────────────
-- エントリー受付（false = エントリー受付画面に表示しない）
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS entry_enabled BOOLEAN NOT NULL DEFAULT true;
-- コート名（例: {'Aコート','Bコート'}）
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS courts TEXT[] NOT NULL DEFAULT '{}';

-- ── scores（提出されたスコア）───────────────────────────────
-- チーム名は提出時点の文字列を保存する（entries が消えても結果は残す）
CREATE TABLE IF NOT EXISTS scores (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id     UUID        REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  court             TEXT        NOT NULL,
  team_a            TEXT        NOT NULL,
  team_b            TEXT        NOT NULL,
  -- 各セットの得点（未実施セットは NULL）
  set1_a INTEGER, set1_b INTEGER,
  set2_a INTEGER, set2_b INTEGER,
  set3_a INTEGER, set3_b INTEGER,
  winner_team       TEXT        NOT NULL,
  referee_team      TEXT        NOT NULL,
  referee_name      TEXT        NOT NULL,
  -- 提出者（LINE）
  line_user_id      TEXT,
  line_display_name TEXT,
  -- 管理者の既読管理
  is_read           BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scores_tournament_id_idx ON scores (tournament_id);
CREATE INDEX IF NOT EXISTS scores_unread_idx        ON scores (tournament_id) WHERE is_read = false;

ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "scores_all" ON scores;
CREATE POLICY "scores_all" ON scores FOR ALL USING (true) WITH CHECK (true);
