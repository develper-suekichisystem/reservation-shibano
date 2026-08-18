-- ============================================================
-- ONE UP 大会エントリーシステム — Supabase Schema
-- ============================================================

-- ============================================================
-- tournaments（大会マスタ）
-- ============================================================
CREATE TABLE tournaments (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  fiscal_year TEXT        NOT NULL,              -- "2025", "2026" など
  event_date  DATE        NOT NULL,
  venue       TEXT        NOT NULL,
  capacity    INTEGER     NOT NULL DEFAULT 16,
  description TEXT,
  -- エントリー受付期間（NULL = 開始:即時 / 終了:開催日の1週間前まで）
  entry_start_at TIMESTAMPTZ,
  entry_end_at   TIMESTAMPTZ,
  -- エントリー制限（true = 同一年度1アカウント1エントリー）
  entry_limit_enabled BOOLEAN NOT NULL DEFAULT true,
  -- エントリー受付（false = エントリー受付画面に表示しない）
  entry_enabled BOOLEAN NOT NULL DEFAULT true,
  -- コート名（例: {'Aコート','Bコート'}）
  courts TEXT[] NOT NULL DEFAULT '{}',
  is_active   BOOLEAN     DEFAULT true,
  sort_order  INTEGER     DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- entries（エントリー）
-- 代表者名・電話番号は参加者エントリーでは必須（アプリ側で検証）。
-- 管理者登録はチーム名のみで作成するため、DB上は NULL 許容とする。
-- fiscal_year はエントリー制限ONの大会のみ記録し、年度制限の判定に使う。
-- ============================================================
CREATE TABLE entries (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id       UUID        REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  fiscal_year         TEXT,
  line_user_id        TEXT,
  line_display_name   TEXT,
  team_name           TEXT        NOT NULL,
  representative_name TEXT,
  phone               TEXT,
  status              TEXT        DEFAULT 'confirmed'
                                  CHECK (status IN ('confirmed', 'cancelled')),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX entries_tournament_id_idx ON entries (tournament_id);
CREATE INDEX entries_line_user_id_idx  ON entries (line_user_id);

-- エントリー制限ONの大会: 1アカウントにつき1年度1エントリー
CREATE UNIQUE INDEX entries_one_per_year_idx
  ON entries (line_user_id, fiscal_year)
  WHERE status = 'confirmed'
    AND line_user_id IS NOT NULL
    AND fiscal_year  IS NOT NULL;

-- 全大会共通: 1アカウントにつき同一大会1エントリー
-- （line_user_id が NULL の管理者登録は対象外）
CREATE UNIQUE INDEX entries_one_per_tournament_idx
  ON entries (tournament_id, line_user_id)
  WHERE status = 'confirmed'
    AND line_user_id IS NOT NULL;

-- ============================================================
-- scores（提出されたスコア）
-- チーム名は提出時点の文字列を保存する（entries が消えても結果は残す）
-- ============================================================
CREATE TABLE scores (
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
  line_user_id      TEXT,
  line_display_name TEXT,
  is_read           BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX scores_tournament_id_idx ON scores (tournament_id);
CREATE INDEX scores_unread_idx        ON scores (tournament_id) WHERE is_read = false;

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournaments_all" ON tournaments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "entries_all"     ON entries     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "scores_all"      ON scores      FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 初期データ（大会サンプル）— 必要に応じて編集してください
-- ============================================================
INSERT INTO tournaments (name, fiscal_year, event_date, venue, capacity, description, entry_limit_enabled, is_active, sort_order) VALUES
  ('第8回 サマーカップ', '2025', '2025-08-01', '市民総合体育館',       16, '夏恒例のオープン大会。初心者チームも歓迎です。',       true,  true, 1),
  ('交流大会 Vol.3',     '2025', '2025-08-15', '中央スポーツセンター', 8,  '交流をメインとしたレクリエーション大会です。',         false, true, 2),
  ('ナイターカップ',     '2025', '2025-09-05', '北部体育館',           12, '夜間開催。お仕事帰りでも参加しやすい大会です。',       false, true, 3);
