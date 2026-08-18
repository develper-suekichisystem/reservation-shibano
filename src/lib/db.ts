// ============================================================
// データ層（ONE UP 大会エントリー用）— Supabase 実装
// mockDb と同じシグネチャを提供し、呼び出し側は差し替え不要。
// ============================================================
import { supabase } from './supabase';
import { entryPeriodStatus, entryStartAt, formatDateTime } from './format';
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
  entry_start_at: string | null;
  entry_end_at: string | null;
  entry_limit_enabled: boolean;
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
  // 年度(fiscal_year)は作成後に変更不可。既存エントリーの年度と不整合になるため更新対象から除外する。
  const { fiscal_year: _fiscalYear, ...updatable } = payload;
  const { error } = await supabase
    .from('tournaments')
    .update(updatable)
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

// 受付期間・定員を検証し、大会行を返す（共通処理）
async function loadOpenTournament(tournamentId: string) {
  const { data: tournament, error: tError } = await supabase
    .from('tournaments')
    .select('id, capacity, event_date, entry_start_at, entry_end_at, entry_limit_enabled, fiscal_year')
    .eq('id', tournamentId)
    .maybeSingle();
  if (tError) throw new Error(tError.message);
  if (!tournament) throw new Error('大会が見つかりません');
  return tournament as Pick<
    Tournament,
    'id' | 'capacity' | 'event_date' | 'entry_start_at' | 'entry_end_at' | 'entry_limit_enabled' | 'fiscal_year'
  >;
}

async function assertCapacityAvailable(tournamentId: string, capacity: number): Promise<void> {
  const { count, error } = await supabase
    .from('entries')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId)
    .eq('status', 'confirmed');
  if (error) throw new Error(error.message);
  if ((count ?? 0) >= capacity) {
    throw new Error('この大会は定員に達しています。');
  }
}

export interface CreateEntryParams {
  tournamentId: string;
  lineUserId: string;
  lineDisplayName: string | null;
  teamName: string;
  representativeName: string;
  phone: string;
}

export async function createEntry(params: CreateEntryParams): Promise<Entry> {
  const tournament = await loadOpenTournament(params.tournamentId);

  // 受付期間チェック
  const status = entryPeriodStatus(tournament);
  if (status === 'before') {
    const start = entryStartAt(tournament)!;
    throw new Error(`この大会の受付開始は ${formatDateTime(start.toISOString())} からです。`);
  }
  if (status === 'closed') {
    throw new Error('この大会は受付を終了しました。');
  }

  // エントリー制限ONの大会のみ年度を記録し、同一年度の重複を禁止する
  const fiscalYear = tournament.entry_limit_enabled ? tournament.fiscal_year : null;
  if (fiscalYear) {
    const { data: existing, error: eError } = await supabase
      .from('entries')
      .select('id')
      .eq('fiscal_year', fiscalYear)
      .eq('line_user_id', params.lineUserId)
      .eq('status', 'confirmed')
      .maybeSingle();
    if (eError) throw new Error(eError.message);
    if (existing) {
      throw new Error(`${fiscalYear}年度の大会には既にエントリー済みです。
1つの年度につき1大会のみご参加いただけます。`);
    }
  }

  // 同一大会の重複エントリーを禁止
  const { data: sameTournament, error: stError } = await supabase
    .from('entries')
    .select('id')
    .eq('tournament_id', params.tournamentId)
    .eq('line_user_id', params.lineUserId)
    .eq('status', 'confirmed')
    .maybeSingle();
  if (stError) throw new Error(stError.message);
  if (sameTournament) throw new Error('この大会には既にエントリー済みです。');

  await assertCapacityAvailable(params.tournamentId, tournament.capacity);

  const { data: entry, error: insertError } = await supabase
    .from('entries')
    .insert({
      tournament_id: params.tournamentId,
      fiscal_year: fiscalYear,
      line_user_id: params.lineUserId,
      line_display_name: params.lineDisplayName,
      team_name: params.teamName.trim(),
      representative_name: params.representativeName.trim(),
      phone: params.phone.trim(),
      status: 'confirmed',
    })
    .select()
    .single();
  if (insertError) {
    // 一意制約（年度重複 / 同一大会重複）に引っかかった場合
    if (insertError.code === '23505') {
      throw new Error(fiscalYear
        ? `${fiscalYear}年度の大会には既にエントリー済みです。`
        : 'この大会には既にエントリー済みです。');
    }
    throw new Error(insertError.message);
  }
  return entry as Entry;
}

// 管理者によるエントリー登録（チーム名のみ）
// LINEアカウントに紐づかないため、定員のみカウントし年度制限の対象外とする。
export async function createAdminEntry(tournamentId: string, teamName: string): Promise<Entry> {
  const name = teamName.trim();
  if (!name) throw new Error('チーム名を入力してください');

  const tournament = await loadOpenTournament(tournamentId);
  await assertCapacityAvailable(tournamentId, tournament.capacity);

  const { data: entry, error } = await supabase
    .from('entries')
    .insert({
      tournament_id: tournamentId,
      fiscal_year: null,
      line_user_id: null,
      line_display_name: null,
      team_name: name,
      representative_name: null,
      phone: null,
      status: 'confirmed',
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
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

// ユーザーの確定済みエントリー一覧（ユーザー側の制限判定・表示用）
export async function fetchUserEntries(
  lineUserId: string,
): Promise<(Entry & { tournament?: Tournament })[]> {
  const { data, error } = await supabase
    .from('entries')
    .select('*, tournament:tournaments(*)')
    .eq('line_user_id', lineUserId)
    .eq('status', 'confirmed');
  if (error) throw new Error(error.message);

  return ((data ?? []) as (Entry & { tournament: TournamentRow | null })[]).map(row => {
    const { tournament, ...entry } = row;
    return { ...entry, tournament: tournament ? toTournament(tournament) : undefined };
  });
}

export async function cancelEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('entries')
    .update({ status: 'cancelled' })
    .eq('id', id);
  if (error) throw new Error(error.message);
}
