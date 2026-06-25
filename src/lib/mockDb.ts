// ============================================================
// モックデータベース（ONE UP 大会エントリー用）
// localStorage に永続化。Supabase の代わりに動作するデモ用データ層。
// ============================================================
import type { Tournament, TournamentWithCount, Entry, UserProfile } from '../types';

const STORAGE_KEY = 'reservation_shibano_db_v1';
const LATENCY_MS = 400;

interface DbData {
  tournaments: Tournament[];
  entries: Entry[];
  userProfiles: UserProfile[];
}

const delay = () => new Promise(resolve => setTimeout(resolve, LATENCY_MS));
const uuid = () => crypto.randomUUID();

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

// ── 初期データ生成 ──────────────────────────────────────────
function seed(): DbData {
  const today = new Date();
  const eventDate = (offset: number) => formatDate(addDays(today, offset));
  const currentYear = today.getFullYear();
  const fy = String(currentYear);
  const fyNext = String(currentYear + 1);

  const tournaments: Tournament[] = [
    {
      id: uuid(), name: '第8回 サマーカップ', fiscal_year: fy,
      event_date: eventDate(20), venue: '市民総合体育館',
      capacity: 16,
      description: '夏恒例のオープン大会。初心者チームも歓迎です。',
      is_active: true, sort_order: 1,
    },
    {
      id: uuid(), name: '交流大会 Vol.3', fiscal_year: fy,
      event_date: eventDate(34), venue: '中央スポーツセンター',
      capacity: 8,
      description: '交流をメインとしたレクリエーション大会です。',
      is_active: true, sort_order: 2,
    },
    {
      id: uuid(), name: 'ナイターカップ', fiscal_year: fy,
      event_date: eventDate(55), venue: '北部体育館',
      capacity: 12,
      description: '夜間開催。お仕事帰りでも参加しやすい大会です。',
      is_active: true, sort_order: 3,
    },
    {
      id: uuid(), name: '秋季リーグ 開幕戦', fiscal_year: fy,
      event_date: eventDate(80), venue: '県立アリーナ',
      capacity: 12,
      description: '上位チームは決勝大会へ進出します。',
      is_active: true, sort_order: 4,
    },
    {
      id: uuid(), name: '新春カップ', fiscal_year: fyNext,
      event_date: eventDate(120), venue: '市民総合体育館',
      capacity: 16,
      description: `${fyNext}年度 最初の大会。新チームの参加も大歓迎！`,
      is_active: true, sort_order: 5,
    },
  ];

  const TEAM_NAMES = [
    'チームサンダー', 'ブルーウェーブ', 'スマッシュキングス', 'レッドスターズ',
    'シーガルズ', 'ファイヤーボールズ', 'グリーンホッパーズ', 'ウィングス',
    'タイガーアタック', 'ホワイトベアーズ', 'コスモス', 'ライジングサン',
    'オーシャンズ', 'サンライズ', 'ストライカーズ', 'ピースフル',
  ];
  const REP_NAMES = [
    '田中 一郎', '鈴木 健太', '高橋 直美', '伊藤 大輔', '渡辺 さくら',
    '山本 翔太', '中村 美穂', '小林 拓也', '加藤 由紀', '吉田 浩二',
    '佐々木 蓮', '山口 真央',
  ];

  const entries: Entry[] = [];
  const userProfiles: UserProfile[] = [];
  let teamIdx = 0;
  const baseTime = today.getTime() - 1000 * 60 * 60 * 24 * 7;
  let seq = 0;

  function pushEntries(tournamentId: string, fiscalYear: string, count: number) {
    for (let i = 0; i < count; i++) {
      const lineUserId = `demo-seed-user-${teamIdx}`;
      entries.push({
        id: uuid(),
        tournament_id: tournamentId,
        fiscal_year: fiscalYear,
        line_user_id: lineUserId,
        team_name: TEAM_NAMES[teamIdx % TEAM_NAMES.length],
        representative_name: REP_NAMES[teamIdx % REP_NAMES.length],
        status: 'confirmed',
        created_at: new Date(baseTime + seq * 1000 * 60 * 30).toISOString(),
      });
      userProfiles.push({
        line_user_id: lineUserId,
        full_name: REP_NAMES[teamIdx % REP_NAMES.length],
        phone: `090-${String(1000 + teamIdx).padStart(4, '0')}-${String(5000 + teamIdx).padStart(4, '0')}`,
        created_at: new Date(baseTime + seq * 1000 * 60 * 30).toISOString(),
      });
      teamIdx++;
      seq++;
    }
  }

  pushEntries(tournaments[0].id, fy, 6);   // サマーカップ: 16枠中6
  pushEntries(tournaments[1].id, fy, 8);   // 交流大会: 8枠中8 → 満員デモ用
  pushEntries(tournaments[2].id, fy, 3);   // ナイターカップ: 12枠中3
  pushEntries(tournaments[3].id, fy, 11);  // 秋季リーグ: 12枠中11 → 残り1枠

  return { tournaments, entries, userProfiles };
}

// ── 永続化 ──────────────────────────────────────────────────
function load(): DbData {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as DbData;
    } catch {
      // 壊れていたら作り直す
    }
  }
  const data = seed();
  save(data);
  return data;
}

function save(db: DbData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export async function resetDemoData(): Promise<void> {
  await delay();
  save(seed());
}

// ── ユーザープロフィール ─────────────────────────────────────
export async function fetchUserProfile(lineUserId: string): Promise<UserProfile | null> {
  await delay();
  const db = load();
  return db.userProfiles.find(p => p.line_user_id === lineUserId) ?? null;
}

export async function saveUserProfile(profile: Omit<UserProfile, 'created_at'>): Promise<void> {
  await delay();
  const db = load();
  const existing = db.userProfiles.find(p => p.line_user_id === profile.line_user_id);
  if (existing) {
    Object.assign(existing, profile);
  } else {
    db.userProfiles.push({ ...profile, created_at: new Date().toISOString() });
  }
  save(db);
}

// ── 大会 ────────────────────────────────────────────────────
function confirmedCount(db: DbData, tournamentId: string): number {
  return db.entries.filter(e => e.tournament_id === tournamentId && e.status === 'confirmed').length;
}

function withCount(db: DbData, t: Tournament): TournamentWithCount {
  return { ...t, confirmed_count: confirmedCount(db, t.id) };
}

export async function fetchActiveTournaments(): Promise<TournamentWithCount[]> {
  await delay();
  const db = load();
  return db.tournaments
    .filter(t => t.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(t => withCount(db, t));
}

export async function fetchAllTournaments(): Promise<TournamentWithCount[]> {
  await delay();
  const db = load();
  return db.tournaments
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(t => withCount(db, t));
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
  await delay();
  const db = load();
  const maxOrder = db.tournaments.length > 0 ? Math.max(...db.tournaments.map(t => t.sort_order)) + 1 : 1;
  db.tournaments.push({
    id: uuid(),
    ...payload,
    description: payload.description ?? undefined,
    sort_order: maxOrder,
  });
  save(db);
}

export async function updateTournament(id: string, payload: TournamentPayload): Promise<void> {
  await delay();
  const db = load();
  const t = db.tournaments.find(t => t.id === id);
  if (t) {
    Object.assign(t, payload, { description: payload.description ?? undefined });
    save(db);
  }
}

export async function setTournamentActive(id: string, isActive: boolean): Promise<void> {
  await delay();
  const db = load();
  const t = db.tournaments.find(t => t.id === id);
  if (t) {
    t.is_active = isActive;
    save(db);
  }
}

export async function deleteTournament(id: string): Promise<void> {
  await delay();
  const db = load();
  db.tournaments = db.tournaments.filter(t => t.id !== id);
  db.entries = db.entries.filter(e => e.tournament_id !== id);
  save(db);
}

// ── エントリー ──────────────────────────────────────────────
export interface CreateEntryParams {
  tournamentId: string;
  fiscalYear: string;
  lineUserId: string;
  teamName: string;
  representativeName: string;
}

export async function createEntry(params: CreateEntryParams): Promise<Entry> {
  await delay();
  const db = load();

  const tournament = db.tournaments.find(t => t.id === params.tournamentId);
  if (!tournament) throw new Error('大会が見つかりません');

  // 同一年度に既にエントリー済みか確認
  const alreadyEntered = db.entries.some(e =>
    e.fiscal_year === params.fiscalYear &&
    e.line_user_id === params.lineUserId &&
    e.status === 'confirmed'
  );
  if (alreadyEntered) {
    throw new Error(`${params.fiscalYear}年度の大会には既にエントリー済みです。\n1つの年度につき1大会のみご参加いただけます。`);
  }

  // 定員チェック（キャンセル待ちなし）
  const count = confirmedCount(db, params.tournamentId);
  if (count >= tournament.capacity) {
    throw new Error('この大会は定員に達しています。');
  }

  const entry: Entry = {
    id: uuid(),
    tournament_id: params.tournamentId,
    fiscal_year: params.fiscalYear,
    line_user_id: params.lineUserId,
    team_name: params.teamName.trim(),
    representative_name: params.representativeName.trim(),
    status: 'confirmed',
    created_at: new Date().toISOString(),
  };
  db.entries.push(entry);
  save(db);
  return entry;
}

export async function fetchEntries(tournamentId: string): Promise<(Entry & { phone?: string })[]> {
  await delay();
  const db = load();
  const entries = db.entries
    .filter(e => e.tournament_id === tournamentId && e.status !== 'cancelled')
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  // プロフィールから電話番号を付与
  return entries.map(e => ({
    ...e,
    phone: db.userProfiles.find(p => p.line_user_id === e.line_user_id)?.phone,
  }));
}

// ユーザーの既存エントリーを年度で確認（ユーザー向け表示用）
export async function fetchUserEntry(lineUserId: string, fiscalYear: string): Promise<(Entry & { tournament?: Tournament }) | null> {
  await delay();
  const db = load();
  const entry = db.entries.find(
    e => e.line_user_id === lineUserId && e.fiscal_year === fiscalYear && e.status === 'confirmed'
  );
  if (!entry) return null;
  const tournament = db.tournaments.find(t => t.id === entry.tournament_id);
  return { ...entry, tournament };
}

export async function cancelEntry(id: string): Promise<void> {
  await delay();
  const db = load();
  const entry = db.entries.find(e => e.id === id);
  if (entry) {
    entry.status = 'cancelled';
    save(db);
  }
}
