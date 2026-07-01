// ============================================================
// データ層（ONE UP 大会エントリー用）— Supabase 実装
// mockDb と同じシグネチャを提供し、呼び出し側は差し替え不要。
// ============================================================
import { supabase } from './supabase';
import type { Tournament, TournamentWithCount, Entry } from '../types';

// DB の row（description は null を取りうる）
type TournamentRow = Omit<Tournament, 'description'> & { description: string | null };

function toTournament(row: TournamentRow): Tournament {
  return { ...row, description: row.description ?? undefined };
}

// tournament_id ごとの confirmed 件数を集計
async function fetchConfirmedCounts(): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('entries')
    .select('tournament_id')
    .eq('status', 'confirmed');
  if (error) throw new Error(error.message);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.tournament_id, (counts.get(row.tournament_id) ?? 0) + 1);
  }
  return counts;
}

async function withCounts(rows: TournamentRow[]): Promise<TournamentWithCount[]> {
  const counts = await fetchConfirmedCounts();
  return rows.map(row => ({
    ...toTournament(row),
    confirmed_count: counts.get(row.id) ?? 0,
  }));
}

// ── 大会 ────────────────────────────────────────────────────
export async function fetchActiveTournaments(): Promise<TournamentWithCount[]> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return withCounts((data ?? []) as TournamentRow[]);
}

export async function fetchAllTournaments(): Promise<TournamentWithCount[]> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return withCounts((data ?? []) as TournamentRow[]);
}

export interface TournamentPayload {
  name: string;
  fiscal_year: string;
  event_date: string;
  venue: string;
  capacity: number;
  description: string | null;
  is_active: boolean;
}

export async function createTournament(payload: TournamentPayload): Promise<void> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);

  const maxOrder = data && data.length > 0 ? data[0].sort_order + 1 : 1;

  const { error: insertError } = await supabase
    .from('tournaments')
    .insert({ ...payload, sort_order: maxOrder });
  if (insertError) throw new Error(insertError.message);
}

export async function updateTournament(id: string, payload: TournamentPayload): Promise<void> {
  const { error } = await supabase
    .from('tournaments')
    .update(payload)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setTournamentActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('tournaments')
    .update({ is_active: isActive })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteTournament(id: string): Promise<void> {
  // entries は ON DELETE CASCADE で自動削除される
  const { error } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ── エントリー ──────────────────────────────────────────────
export interface CreateEntryParams {
  tournamentId: string;
  fiscalYear: string;
  lineUserId: string;
  teamName: string;
  representativeName: string;
  phone: string;
}

export async function createEntry(params: CreateEntryParams): Promise<Entry> {
  // 大会の存在・定員を取得
  const { data: tournament, error: tError } = await supabase
    .from('tournaments')
    .select('id, capacity')
    .eq('id', params.tournamentId)
    .maybeSingle();
  if (tError) throw new Error(tError.message);
  if (!tournament) throw new Error('大会が見つかりません');

  // 同一年度に既にエントリー済みか確認
  const { data: existing, error: eError } = await supabase
    .from('entries')
    .select('id')
    .eq('fiscal_year', params.fiscalYear)
    .eq('line_user_id', params.lineUserId)
    .eq('status', 'confirmed')
    .maybeSingle();
  if (eError) throw new Error(eError.message);
  if (existing) {
    throw new Error(`${params.fiscalYear}年度の大会には既にエントリー済みです。\n1つの年度につき1大会のみご参加いただけます。`);
  }

  // 定員チェック（キャンセル待ちなし）
  const { count, error: cError } = await supabase
    .from('entries')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', params.tournamentId)
    .eq('status', 'confirmed');
  if (cError) throw new Error(cError.message);
  if ((count ?? 0) >= tournament.capacity) {
    throw new Error('この大会は定員に達しています。');
  }

  const { data: entry, error: insertError } = await supabase
    .from('entries')
    .insert({
      tournament_id: params.tournamentId,
      fiscal_year: params.fiscalYear,
      line_user_id: params.lineUserId,
      team_name: params.teamName.trim(),
      representative_name: params.representativeName.trim(),
      phone: params.phone.trim(),
      status: 'confirmed',
    })
    .select()
    .single();
  if (insertError) {
    // 一意制約（同一年度重複）に引っかかった場合
    if (insertError.code === '23505') {
      throw new Error(`${params.fiscalYear}年度の大会には既にエントリー済みです。`);
    }
    throw new Error(insertError.message);
  }
  return entry as Entry;
}

export async function fetchEntries(tournamentId: string): Promise<Entry[]> {
  const { data: entries, error } = await supabase
    .from('entries')
    .select('*')
    .eq('tournament_id', tournamentId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (entries ?? []) as Entry[];
}

// ユーザーの既存エントリーを年度で確認（ユーザー向け表示用）
export async function fetchUserEntry(
  lineUserId: string,
  fiscalYear: string,
): Promise<(Entry & { tournament?: Tournament }) | null> {
  const { data, error } = await supabase
    .from('entries')
    .select('*, tournament:tournaments(*)')
    .eq('line_user_id', lineUserId)
    .eq('fiscal_year', fiscalYear)
    .eq('status', 'confirmed')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const { tournament, ...entry } = data as Entry & { tournament: TournamentRow | null };
  return {
    ...entry,
    tournament: tournament ? toTournament(tournament) : undefined,
  };
}

export async function cancelEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('entries')
    .update({ status: 'cancelled' })
    .eq('id', id);
  if (error) throw new Error(error.message);
}
