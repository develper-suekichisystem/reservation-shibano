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
  is_active   BOOLEAN     DEFAULT true,
  sort_order  INTEGER     DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- user_profiles（LINE連携ユーザーのプロフィール）
-- ============================================================
CREATE TABLE user_profiles (
  line_user_id TEXT        PRIMARY KEY,
  full_name    TEXT        NOT NULL,
  phone        TEXT        NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- entries（エントリー）
-- ============================================================
CREATE TABLE entries (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id       UUID        REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  fiscal_year         TEXT        NOT NULL,
  line_user_id        TEXT        NOT NULL,
  team_name           TEXT        NOT NULL,
  representative_name TEXT        NOT NULL,
  status              TEXT        DEFAULT 'confirmed'
                                  CHECK (status IN ('confirmed', 'cancelled')),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX entries_tournament_id_idx ON entries (tournament_id);
CREATE INDEX entries_line_user_id_idx  ON entries (line_user_id);

-- 1ユーザーにつき1年度1エントリー（confirmed のみ）を担保
CREATE UNIQUE INDEX entries_one_per_year_idx
  ON entries (line_user_id, fiscal_year)
  WHERE status = 'confirmed';

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE tournaments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournaments_all"   ON tournaments   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "user_profiles_all" ON user_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "entries_all"       ON entries       FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 初期データ（大会サンプル）— 必要に応じて編集してください
-- ============================================================
INSERT INTO tournaments (name, fiscal_year, event_date, venue, capacity, description, is_active, sort_order) VALUES
  ('第8回 サマーカップ', '2025', '2025-08-01', '市民総合体育館',       16, '夏恒例のオープン大会。初心者チームも歓迎です。',       true, 1),
  ('交流大会 Vol.3',     '2025', '2025-08-15', '中央スポーツセンター', 8,  '交流をメインとしたレクリエーション大会です。',         true, 2),
  ('ナイターカップ',     '2025', '2025-09-05', '北部体育館',           12, '夜間開催。お仕事帰りでも参加しやすい大会です。',       true, 3);
