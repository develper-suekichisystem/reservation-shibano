export interface Tournament {
  id: string;
  name: string;
  fiscal_year: string;   // "2025", "2026" etc.
  event_date: string;    // YYYY-MM-DD
  venue: string;
  capacity: number;
  description?: string;
  entry_start_at: string | null;   // ISO日時 / null = 即時エントリー可
  entry_end_at: string | null;     // ISO日時 / null = 開催日の1週間前まで
  entry_limit_enabled: boolean;    // true = 同一年度1アカウント1エントリー
  entry_enabled: boolean;          // false = エントリー受付画面に表示しない
  courts: string[];                // コート名
  notify_emails: string[];         // スコア提出時の通知先メールアドレス
  is_active: boolean;
  sort_order: number;
}

export interface TournamentWithCount extends Tournament {
  confirmed_count: number;
}

export type EntryStatus = 'confirmed' | 'cancelled';

export interface Entry {
  id: string;
  tournament_id: string;
  fiscal_year: string | null;      // エントリー制限ONの大会のみ記録
  line_user_id: string | null;     // 管理者登録は null
  line_display_name: string | null;
  team_name: string;
  representative_name: string | null;
  phone: string | null;
  status: EntryStatus;
  created_at: string;
  tournament?: Tournament;
}

export interface EntryState {
  selectedTournament: TournamentWithCount | null;
  teamName: string;
  representativeName: string;
  phone: string;
}

export type Step = 'tournament' | 'line' | 'form' | 'confirm' | 'complete';

// ── スコア ──────────────────────────────────────────────────
export interface ScoreSet {
  a: number | null;
  b: number | null;
}

export interface Score {
  id: string;
  tournament_id: string;
  court: string;
  team_a: string;
  team_b: string;
  set1_a: number | null; set1_b: number | null;
  set2_a: number | null; set2_b: number | null;
  set3_a: number | null; set3_b: number | null;
  winner_team: string;
  referee_team: string;
  referee_name: string;
  line_user_id: string | null;
  line_display_name: string | null;
  is_read: boolean;
  created_at: string;
}
