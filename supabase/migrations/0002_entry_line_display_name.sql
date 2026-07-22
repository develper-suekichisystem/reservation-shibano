-- ============================================================
-- Migration 0002: エントリーに LINE 表示名を保存
--   - entries に line_display_name カラムを追加
--   - userId は人が検索・識別できないため、表示名を控える
-- 適用対象: 0001 適用済みのDB
-- 備考: 既存行は NULL（表示名未取得）となる
-- ============================================================

ALTER TABLE entries ADD COLUMN IF NOT EXISTS line_display_name TEXT;
