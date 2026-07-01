export interface Tournament {
  id: string;
  name: string;
  fiscal_year: string;   // "2025", "2026" etc.
  event_date: string;    // YYYY-MM-DD
  venue: string;
  capacity: number;
  description?: string;
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
  fiscal_year: string;
  line_user_id: string;
  team_name: string;
  representative_name: string;
  phone: string;
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

export type Step = 'tournament' | 'form' | 'confirm' | 'complete';
