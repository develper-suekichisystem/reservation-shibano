-- ============================================================
-- Migration 0001: エントリー時に電話番号を必須化
--   - entries に phone カラムを追加
--   - 事前登録（user_profiles）を廃止
-- 適用対象: 旧スキーマ（phone なし / user_profiles あり）を作成済みのDB
-- 備考: entries が空の状態で実行することを想定
-- ============================================================

-- entries に電話番号カラムを追加
ALTER TABLE entries ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL;

-- 不要になったプロフィールテーブルを削除
DROP TABLE IF EXISTS user_profiles;
