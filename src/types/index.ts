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
